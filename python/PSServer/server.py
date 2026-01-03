import asyncio
import websockets
import json
import threading
import queue


class Browser:
    def __init__(self, websocket, loop):
        self._websocket = websocket
        self._loop = loop
        self._results = {}
        self._result_events = {}

    def _send_and_wait(self, msg):
        request_id = str(id(msg))
        msg['id'] = request_id
        event = threading.Event()
        self._result_events[request_id] = event
        
        # Schedule sending message in the event loop
        asyncio.run_coroutine_threadsafe(
            self._websocket.send(json.dumps(msg)), 
            self._loop
        )
        
        # Wait for result
        if not event.wait(timeout=30):
            raise TimeoutError("Command timed out")
            
        result = self._results.pop(request_id)
        if isinstance(result, dict) and 'error' in result:
            raise Exception(f"JS Error: {result['error']}")
        return result

    def run(self, javascript_code: str):
        """Run javascript code with inspectedWindow.eval."""
        return self._send_and_wait({'type': 'eval', 'script': javascript_code})

    def click(self, selector: str):
        """Click element by selector."""
        script = f"document.querySelector('{selector}').click()"
        return self.run(script)

    def input(self, selector: str, input_content: str):
        """Input content into element by selector."""
        # Escaping single quotes for JS
        escaped_content = input_content.replace("'", "\\'")
        script = f"""
            (function() {{
                const el = document.querySelector('{selector}');
                el.value = '{escaped_content}';
                el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                el.dispatchEvent(new Event('change', {{ bubbles: true }}));
            }})()
        """
        return self.run(script)

    def get_html(self, selector: str = "body"):
        """Query selector and return the outerHTML string."""
        return self.run(f"document.querySelector('{selector}').outerHTML")


    def get_image(self, selector: str):
        """Get a bytes object of the image of img tag selected by the selector, or background-image target."""
        script = r"""
            (function() {
                const el = document.querySelector('""" + selector + r"""');
                if (!el) return null;
                
                let url = '';
                if (el.tagName.toLowerCase() === 'img') {
                    url = el.src;
                } else {
                    const bg = window.getComputedStyle(el).backgroundImage;
                    const match = bg.match(/url\(["']?(.*?)["']?\)/);
                    if (match) url = match[1];
                }
                
                if (!url) return null;
                
                return fetch(url)
                    .then(r => r.arrayBuffer())
                    .then(buf => {
                        let binary = '';
                        const bytes = new Uint8Array(buf);
                        const len = bytes.byteLength;
                        for (let i = 0; i < len; i++) {
                            binary += String.fromCharCode(bytes[i]);
                        }
                        return {
                            data: btoa(binary),
                            type: 'image_bytes'
                        };
                    });
            })()
        """
        import base64
        result = self.run(script)
        if result and isinstance(result, dict) and result.get('type') == 'image_bytes':
            return base64.b64decode(result['data'])
        return None

def run(init=None, on_data=None, host="127.0.0.1", port=8687):
    async def handler(websocket):
        loop = asyncio.get_running_loop()
        browser = Browser(websocket, loop)
        
        print(f"Client connected: {websocket.remote_address}")
        
        # Start the custom_func in a separate thread to keep it synchronous for the user
        if init:
            threading.Thread(target=init, args=(browser,), daemon=True).start()

        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    msg_type = data.get('type')
                    msg_id = data.get('id')
                    
                    if msg_type == 'eval_result' and msg_id:
                        browser._results[msg_id] = data.get('result') or data.get('error')
                        if msg_id in browser._result_events:
                            browser._result_events[msg_id].set()
                    
                    elif msg_type == 'html_data' and on_data:
                        # Call on_data in a thread to avoid blocking the loop
                        threading.Thread(
                            target=on_data, 
                            args=(data.get('label'), data.get('data')), 
                            daemon=True
                        ).start()
                    
                except json.JSONDecodeError:
                    print(f"Received non-JSON message: {message}")
        except websockets.exceptions.ConnectionClosed:
            print("Client disconnected")

    async def main():
        server = await websockets.serve(handler, host, port)
        print(f"PSServer started on ws://{host}:{port}")
        await server.wait_closed()

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer stopped.")
