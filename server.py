import asyncio
import websockets
import json

connected_client = None

async def handler(websocket):
    global connected_client
    connected_client = websocket
    print(f"Client connected: {websocket.remote_address}")
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                msg_type = data.get('type')
                
                if msg_type == 'html_data':
                    print(f"\n[Received HTML] Label: {data.get('label')}")
                    content = data.get('data')
                    if isinstance(content, list):
                         print(f"Count: {len(content)}")
                         # print(f"Preview: {str(content)[:100]}...")
                    else:
                         print(f"Content length: {len(content)}")
                         # print(f"Content: {content[:100]}...")
                
                elif msg_type == 'eval_result':
                    if 'error' in data:
                        print(f"\n[Eval Error]: {data['error']}")
                    else:
                        print(f"\n[Eval Result]: {data['result']}")
                
                else:
                    print(f"Received unknown message: {data}")
            
            except json.JSONDecodeError:
                print(f"Received non-JSON message: {message}")
                
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")
    finally:
        connected_client = None

async def input_loop():
    print("Type a script to eval in browser (or 'exit' to quit):")
    while True:
        script = await asyncio.to_thread(input, "> ")
        if script.lower() == 'exit':
            break
        
        if connected_client:
            msg = json.dumps({'type': 'eval', 'script': script})
            await connected_client.send(msg)
            print("Sent eval request...")
        else:
            print("No client connected.")

async def main():
    server = await websockets.serve(handler, "127.0.0.1", 8687, max_size=104857600)
    print("WebSocket server started on ws://127.0.0.1:8687")
    
    # Run server and input loop concurrently
    await asyncio.gather(server.wait_closed(), input_loop())

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer stopped.")
