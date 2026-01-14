# Point Cloud Annotator

A point cloud annotation application with a **serverless backend**, a **local backend for comparison**, and a **React frontend**.

---

## Serverless Backend (Primary)

The main backend is built using **AWS Serverless**:

- AWS Lambda (Node.js)
- API Gateway
- DynamoDB
- AWS SAM

### API
- `GET /` – Get all annotations  
- `POST /` – Create an annotation  
- `DELETE /{id}` – Delete an annotation  

This serverless backend is the **production backend used by the frontend**.

---

## Local Backend

A local backend is provided for development and architecture comparison.

- Node.js + Express
- In-memory data store
- Same API design as the serverless backend

Location:
/backend

This backend is **not used in production**.

---

## Frontend

The frontend is built with:

- React
- Vite
- Potree / Three.js

Features:
- Render point cloud
- Create annotations
- List and delete annotations
- Communicates with the serverless API
