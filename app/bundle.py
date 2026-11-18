from pathlib import Path
import re,base64,json
r=Path('dist');s=(r/'index.html').read_text();js=next(r.glob('index-*.js')).read_text();css=next(r.glob('index-*.css')).read_text();im=next(r.glob('muscle-bay-*.png'));js=js.replace(im.name,'data:image/png;base64,'+base64.b64encode(im.read_bytes()).decode())
s=re.sub(r'<script type="module"[^>]*src="[^"]+"[^>]*></script>',lambda m:'<script type="module">'+js.replace('</script','<\\/script')+'</script>',s)
s=re.sub(r'<link rel="stylesheet"[^>]*>',lambda m:'<style>'+css+'</style>',s)
s=s.replace('./apple-touch-icon.png','data:image/png;base64,'+base64.b64encode((r/'apple-touch-icon.png').read_bytes()).decode());m=json.loads((r/'manifest.webmanifest').read_text())
for i in m['icons']:i['src']='data:image/png;base64,'+base64.b64encode((r/i['src']).read_bytes()).decode()
s=s.replace('./manifest.webmanifest','data:application/manifest+json;base64,'+base64.b64encode(json.dumps(m).encode()).decode());Path('publish/index.html').write_text(s)
