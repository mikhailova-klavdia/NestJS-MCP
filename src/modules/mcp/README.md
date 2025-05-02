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

to list all tools 
```
{
  "jsonrpc":"2.0",
  "id":2,
  "method":"tools/list",
  "params":{}
}
```

to call the hello world command:
```
{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
        "name": "hello-world",
        "arguments": {
            "name": "Alice"
        }
    }
}
```