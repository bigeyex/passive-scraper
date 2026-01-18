import time

# Global variable to persist browser session across reconnections
_global_browser = None
_browser_lock = threading.Lock()


class Browser:
    def __init__(self, websocket, loop):
        self._websocket = websocket
        self._loop = loop
        self._results = {}
        self._result_events = {}
        self._lock = threading.Lock()
        self._next_id = 1
        self._connected_event = threading.Event()
        self._connected_event.set()

    def update_socket(self, websocket, loop):
        """Update the websocket and loop for a persistent session."""
        with self._lock:
            self._websocket = websocket
            self._loop = loop
            self._connected_event.set()
        print("Browser session updated with new connection.")

    def _get_next_id(self):
        with self._lock:
            rid = str(self._next_id)
            self._next_id += 1
            return rid

    def _send_and_wait(self, msg):
        # Wait for a connection if currently disconnected
        if not self._connected_event.wait(timeout=60):
            raise TimeoutError("No active connection for browser command")

        request_id = self._get_next_id()
        msg['id'] = request_id
        event = threading.Event()
        
        with self._lock:
            self._result_events[request_id] = event
            ws = self._websocket
            loop = self._loop
        
        # Schedule sending message in the event loop
        try:
            asyncio.run_coroutine_threadsafe(
                ws.send(json.dumps(msg)), 
                loop
            )
        except Exception as e:
            # If sending fails, maybe the socket just closed
            self._connected_event.clear()
            # Wait once and retry
            if self._connected_event.wait(timeout=30):
                 with self._lock:
                     ws = self._websocket
                     loop = self._loop
                 asyncio.run_coroutine_threadsafe(ws.send(json.dumps(msg)), loop)
            else:
                raise Exception(f"Failed to send command after reconnect wait: {e}")
        
        # Wait for result
        if not event.wait(timeout=30):
            with self._lock:
                self._result_events.pop(request_id, None)
            raise TimeoutError("Command timed out")
            
        with self._lock:
            if request_id not in self._results:
                 raise Exception(f"Result for {request_id} not found in results map")
            result = self._results.pop(request_id)
            self._result_events.pop(request_id, None)

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
        global _global_browser
        loop = asyncio.get_running_loop()
        
        with _browser_lock:
            if _global_browser is None:
                _global_browser = Browser(websocket, loop)
                browser = _global_browser
                # Start the custom_func only once
                if init:
                    threading.Thread(target=init, args=(browser,), daemon=True).start()
            else:
                _global_browser.update_socket(websocket, loop)
                browser = _global_browser

        print(f"Client connected: {websocket.remote_address}")

        try:
            async for message in websocket:
                try:
                    # print(f"DEBUG: Received message: {message}")
                    data = json.loads(message)
                    msg_type = data.get('type')
                    msg_id = data.get('id')
                    
                    if msg_type == 'eval_result':
                        if msg_id:
                            with browser._lock:
                                # Overwrite protection: Only store if we don't have a result yet,
                                # OR if the new message actually has content (result or error).
                                # The log showed a message with result followed by one without.
                                has_content = 'result' in data or 'error' in data
                                if msg_id in browser._result_events:
                                    if has_content:
                                        if 'error' in data:
                                            browser._results[msg_id] = {'error': data.get('error')}
                                        else:
                                            browser._results[msg_id] = data.get('result')
                                    else:
                                        # Explicitly treat as None if no result/error provided
                                        browser._results[msg_id] = None
                                    
                                    browser._result_events[msg_id].set()
                                else:
                                    print(f"Received result for unknown or timed out request ID: {msg_id}")
                        else:
                            print(f"Received eval_result without ID: {data}")
                    
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
        finally:
            with _browser_lock:
                if _global_browser:
                    _global_browser._connected_event.clear()

    async def main():
        # Disable ping_interval and ping_timeout for better stability on localhost
        # and to prevent disconnections when the client is slow or suspended.
        server = await websockets.serve(handler, host, port, ping_interval=None, ping_timeout=None, max_size=104857600)
        print(f"PSServer started on ws://{host}:{port}")
        await server.wait_closed()

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer stopped.")
