"""Servidor local para probar el juego SIN caché del navegador.

    python servir.py          → http://localhost:5500
    python servir.py 5501     → otro puerto

Igual que `python -m http.server 5500 --bind 127.0.0.1`, pero le dice al navegador que no
guarde copias de los archivos. Así cada recarga usa el código nuevo.
(La primera vez, recarga con Ctrl + Shift + R para tirar lo que el navegador ya tenía guardado.)
"""
import http.server
import os
import socketserver
import sys

PUERTO = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
os.chdir(os.path.dirname(os.path.abspath(__file__)))   # sirve la carpeta del juego, se lance desde donde se lance


class SinCache(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()


class Servidor(socketserver.ThreadingTCPServer):
    daemon_threads = True
    allow_reuse_address = False   # si el puerto ya está ocupado, avisa en vez de compartirlo con otro servidor


try:
    with Servidor(('127.0.0.1', PUERTO), SinCache) as servidor:
        print(f'Survival Mars en http://localhost:{PUERTO} (sin caché). Ctrl + C para salir.')
        servidor.serve_forever()
except OSError:
    print(f'El puerto {PUERTO} ya está en uso. Cierra el otro servidor o usa otro puerto: python servir.py 5501')
except KeyboardInterrupt:
    pass
