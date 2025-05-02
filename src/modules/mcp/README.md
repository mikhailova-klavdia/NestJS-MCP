initiate stateless connection:

```
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},

    "clientInfo": {    
      "name": "postman-client",
      "version": "1.0.0"
    }
  },
  "id": 1
}
```

after that send read notification 
```
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized"
}
```
