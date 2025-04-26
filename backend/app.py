from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import networkx as nx

app = Flask(__name__)
CORS(app)

# Load data from JSON files
base_dir = os.path.dirname(os.path.abspath(__file__))

# Load waste_data.json
try:
    with open(os.path.join(base_dir, 'data', 'waste_data.json')) as f:
        waste_data = json.load(f)
except FileNotFoundError:
    raise FileNotFoundError("The file 'waste_data.json' is missing. Please ensure it exists in the 'data' folder.")

# Load distances.json
try:
    with open(os.path.join(base_dir, 'data', 'distances.json')) as f:
        distance_data = json.load(f)
except FileNotFoundError:
    raise FileNotFoundError("The file 'distances.json' is missing. Please ensure it exists in the 'data' folder.")

def optimize_route(blocks, distance_matrix):
    """
    Optimizes the route for visiting blocks using the Traveling Salesman Problem (TSP).
    """
    G = nx.Graph()
    for i in range(len(blocks)):
        for j in range(len(blocks)):
            if i != j:
                G.add_edge(blocks[i], blocks[j], weight=distance_matrix[i][j])
    try:
        return nx.approximation.traveling_salesman_problem(G, cycle=False)
    except Exception as e:
        print(f"Error optimizing route: {e}")
        return blocks  # Fallback to the original order if TSP fails

@app.route('/optimize', methods=['POST'])
def optimize():
    """
    API endpoint to optimize waste collection and route.
    """
    capacity = request.json.get('capacity', 300)
    if not isinstance(capacity, (int, float)) or capacity <= 0:
        return jsonify({"error": "Invalid capacity"}), 400

    # Knapsack optimization logic
    collected = []
    remaining = capacity
    for item in sorted(waste_data, key=lambda x: x['value'] / x['weight'], reverse=True):
        if remaining <= 0:
            break
        if item['divisible']:
            take = min(item['weight'], remaining)
            collected.append({
                **item,
                'collected_weight': take,
                'partial_value': (take / item['weight']) * item['value']
            })
            remaining -= take
        else:
            if item['weight'] <= remaining:
                collected.append(item)
                remaining -= item['weight']

    # Route optimization
    blocks_to_visit = [item['block'] for item in collected]
    if not blocks_to_visit:
        return jsonify({"error": "No blocks to optimize"}), 400

    route = optimize_route(blocks_to_visit, distance_data['matrix'])

    # Calculate total value
    total_value = sum(
        item.get('value', 0) if not item.get('partial_value') else item['partial_value']
        for item in collected
    )

    return jsonify({
        "collected_waste": collected,
        "optimal_route": route,
        "total_value": total_value
    })

if __name__ == '__main__':
    app.run(debug=True)