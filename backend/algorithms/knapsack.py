def hybrid_knapsack(items, capacity):
    """
    Solves the hybrid knapsack problem with both indivisible and divisible items.
    
    Args:
        items (list): A list of dictionaries, each representing an item with keys:
                      'weight', 'value', and 'divisible' (boolean).
        capacity (int): The maximum capacity of the knapsack.
    
    Returns:
        tuple: A list of collected items and the total value of the knapsack.
    """
    # Separate divisible and indivisible items
    divisible = [item for item in items if item['divisible']]
    indivisible = [item for item in items if not item['divisible']]
    
    # 0/1 Knapsack for indivisible items
    n = len(indivisible)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    
    # Fill the DP table
    for i in range(1, n + 1):
        for w in range(1, capacity + 1):
            if indivisible[i - 1]['weight'] <= w:
                dp[i][w] = max(
                    dp[i - 1][w],
                    indivisible[i - 1]['value'] + dp[i - 1][w - indivisible[i - 1]['weight']]
                )
            else:
                dp[i][w] = dp[i - 1][w]
    
    # Traceback to find collected indivisible items
    collected = []
    w = capacity
    for i in range(n, 0, -1):
        if dp[i][w] != dp[i - 1][w]:
            collected.append(indivisible[i - 1])
            w -= indivisible[i - 1]['weight']
    
    # Calculate remaining capacity
    remaining_capacity = capacity - sum(item['weight'] for item in collected)
    
    # Fractional Knapsack for divisible items
    divisible_sorted = sorted(divisible, key=lambda x: x['value'] / x['weight'], reverse=True)
    
    for item in divisible_sorted:
        if remaining_capacity <= 0:
            break
        take = min(item['weight'], remaining_capacity)
        fraction = take / item['weight']
        collected.append({
            **item,
            'collected_weight': take,
            'fraction': fraction,
            'partial_value': fraction * item['value']
        })
        remaining_capacity -= take
    
    # Calculate total value of the knapsack
    total_value = sum(
        item['value'] if not item.get('fraction') else item['partial_value']
        for item in collected
    )
    
    return collected, total_value
