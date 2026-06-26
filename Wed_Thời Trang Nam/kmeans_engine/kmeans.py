import json
import sys
import random
import math

def euclidean_distance(p1, p2):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(p1, p2)))

def main():
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        if not input_data.strip():
            print(json.dumps({"error": "No input data received"}))
            return
        
        payload = json.loads(input_data)
        k = int(payload.get("k", 3))
        users = payload.get("users", [])
        
        if len(users) < k:
            print(json.dumps({"error": f"Number of users ({len(users)}) must be >= k ({k})"}))
            return
        
        # Extract features and user IDs
        user_ids = [u["userId"] for u in users]
        features = [u["features"] for u in users]
        num_features = len(features[0]) if features else 0
        
        if num_features == 0:
            print(json.dumps({"error": "No features provided"}))
            return
            
        # 1. Normalize features (Min-Max Scaling)
        mins = [min(f[i] for f in features) for i in range(num_features)]
        maxs = [max(f[i] for f in features) for i in range(num_features)]
        ranges = [maxs[i] - mins[i] if maxs[i] - mins[i] != 0 else 1 for i in range(num_features)]
        
        normalized = []
        for f in features:
            norm_f = [(f[i] - mins[i]) / ranges[i] for i in range(num_features)]
            normalized.append(norm_f)
            
        # 2. Initialize Centroids (K-Means++ style or random selection)
        # We pick random unique points from normalized features
        random.seed(42)  # For deterministic output
        centroid_indices = random.sample(range(len(normalized)), k)
        centroids = [normalized[idx] for idx in centroid_indices]
        
        # 3. K-Means Loop
        assignments = [-1] * len(normalized)
        max_iterations = 100
        
        for iteration in range(max_iterations):
            changed = False
            
            # Step 3a: Assign to nearest centroid
            for u_idx, feat in enumerate(normalized):
                min_dist = float('inf')
                best_centroid = -1
                for c_idx, centroid in enumerate(centroids):
                    dist = euclidean_distance(feat, centroid)
                    if dist < min_dist:
                        min_dist = dist
                        best_centroid = c_idx
                        
                if assignments[u_idx] != best_centroid:
                    assignments[u_idx] = best_centroid
                    changed = True
                    
            if not changed and iteration > 0:
                break
                
            # Step 3b: Update centroids
            new_centroids = [[0.0] * num_features for _ in range(k)]
            counts = [0] * k
            
            for u_idx, c_idx in enumerate(assignments):
                counts[c_idx] += 1
                for i in range(num_features):
                    new_centroids[c_idx][i] += normalized[u_idx][i]
                    
            for c_idx in range(k):
                if counts[c_idx] > 0:
                    centroids[c_idx] = [new_centroids[c_idx][i] / counts[c_idx] for i in range(num_features)]
                else:
                    # If a centroid has no users assigned, keep it as is
                    pass
        
        # Build response
        assignment_list = []
        for u_idx, c_idx in enumerate(assignments):
            assignment_list.append({
                "userId": user_ids[u_idx],
                "clusterId": c_idx
            })
            
        # We also scale the centroids back to the original range for readability
        denormalized_centroids = []
        for centroid in centroids:
            denorm = [centroid[i] * ranges[i] + mins[i] for i in range(num_features)]
            denormalized_centroids.append(denorm)
            
        response = {
            "k": k,
            "iterations": iteration + 1,
            "centroids": denormalized_centroids,
            "assignments": assignment_list
        }
        
        print(json.dumps(response))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
