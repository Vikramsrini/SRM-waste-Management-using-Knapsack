import networkx as nx

def optimize_route(blocks, distance_matrix):
    """
    Optimizes the route for visiting blocks using the Traveling Salesman Problem (TSP).
    
    Args:
        blocks (list): A list of block names.
        distance_matrix (list of lists): A 2D matrix where distance_matrix[i][j] represents
                                         the distance between blocks[i] and blocks[j].
    
    Returns:
        list: The optimized order of blocks to visit.
    """
    # Create a graph
    G = nx.Graph()
    
    # Add edges with weights (distances) to the graph
    for i, block1 in enumerate(blocks):
        for j, block2 in enumerate(blocks):
            if i != j:  # Avoid self-loops
                G.add_edge(block1, block2, weight=distance_matrix[i][j])
    
    try:
        # Solve the Traveling Salesman Problem (TSP)
        route = nx.approximation.traveling_salesman_problem(G, cycle=False)
        return route
    except Exception as e:
        # Log the error and return the original order as a fallback
        print(f"Error solving TSP: {e}")
        return blocks