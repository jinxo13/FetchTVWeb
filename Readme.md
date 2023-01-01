FetchTV Web UI
Compatible with Python 3.7

## Description
Connects to the FetchTV ecosystem allowing:
- Sending commands to a Fetch Box
- Recording free-to-air (FTA) programs
- Listing and deleting recordings

## Installing

### 1. Running with Docker
1. Create a .env file containing your FetchTV credentials
ACTIVATION_CODE=xxx
PIN=yyy

2. Change the exposed port from ```5002``` if required in start.sh
```docker run -p 5002:5001 --env-file .env --name fetchtvweb fetchtvweb```

3. Run start.sh

4. Navigate to:
```http://<server>:5002/index.html```

### 2. Running stand alone
1. Create a .env file containing your FetchTV credentials
ACTIVATION_CODE=xxx
PIN=yyy

2. Install Python requirements
```pip install -r requirements.txt```

3. Start the application
```python3 app.py```

4. Navigate to:
```http://<server>:5001/index.html```
