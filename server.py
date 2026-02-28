import http.server
import socketserver
import os

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Extract the base path (strip query params and hashes)
        base_path = path.split('?')[0].split('#')[0]
        
        # Determine the physical file path
        actual_path = super().translate_path(path)
        
        # If it's a directory, return it as is (will look for index.html)
        if os.path.isdir(actual_path):
            return actual_path
            
        # If the file doesn't exist and doesn't have an extension, try adding .html
        if not os.path.exists(actual_path) and '.' not in os.path.basename(actual_path):
            if os.path.exists(actual_path + '.html'):
                return actual_path + '.html'
                
        return actual_path

class TCPServer(socketserver.TCPServer):
    allow_reuse_address = True

print(f"Starting server on port {PORT} with .html extensionless support...")
with TCPServer(("", PORT), Handler) as httpd:
    httpd.serve_forever()
