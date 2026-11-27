import osmium,sys,json
f=sys.argv[1];out=[]
def num(v):
    try:return int(str(v).split()[0])
    except:return 0
def row(lat,lon,t):
    fee=t.get('fee','');feev=1 if fee in('yes','ticket','interval') else 0 if fee=='no' else -1
    return [round(lat,6),round(lon,6),t.get('name',''),feev,num(t.get('capacity','')),t.get('park_ride',''),t.get('access',''),t.get('operator',''),t.get('opening_hours',''),t.get('fee:conditions',t.get('charge','')),t.get('maxstay',''),t.get('parking:condition','')]
ways=[];need=set()
for o in osmium.FileProcessor(f,osmium.osm.WAY|osmium.osm.NODE).with_filter(osmium.filter.KeyFilter('park_ride')):
    t=o.tags
    if t.get('amenity')!='parking' or t.get('park_ride')=='no':continue
    tt={k.k:k.v for k in t}
    if o.is_node():out.append(row(o.location.lat,o.location.lon,tt))
    else:
        ids=[n.ref for n in o.nodes];ways.append((ids,tt));need.update(ids)
loc={}
if need:
    for o in osmium.FileProcessor(f,osmium.osm.NODE).with_filter(osmium.filter.IdFilter(need)):
        loc[o.id]=(o.location.lat,o.location.lon)
for ids,tt in ways:
    p=[loc[i] for i in ids if i in loc]
    if p:out.append(row(sum(a for a,b in p)/len(p),sum(b for a,b in p)/len(p),tt))
json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False);print(f,len(out))
