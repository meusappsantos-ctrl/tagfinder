
import React, { useState, useEffect, useRef } from 'react';
import { User, signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  deleteDoc, 
  updateDoc, 
  doc, 
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { 
  LogOut, Tv, Radio, Cpu, ArrowLeft, ArrowRight, Search, Plus, Save, 
  Edit, X, Globe, Trash2, Server, Navigation, MapPin, Loader2, CheckCircle, Crosshair, MapPinOff, Locate, Navigation2, Database, MessageSquare
} from 'lucide-react';

declare const L: any;

interface DashboardProps {
  user: User;
}

interface GroupItem {
  id: string;
  content: string; 
  data?: Record<string, any>; 
  userId: string;
  userEmail: string;
  createdAt: Timestamp | null;
  groupType?: GroupType;
}

type GroupType = 'ctv' | 'telecom' | 'embarcados' | 'painel';
type ViewState = 'home' | GroupType;

const GOOGLE_HYBRID_URL = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
const SATELLITE_ATTRIBUTION = '&copy; Google Maps';

const SYSTEM_DATA: Record<string, string[]> = {
  "SISTEMA 1": ["TR-1081KS-03 (BC)", "TR-1082KS-13 (BCC)", "BELTI EE-1080KS-04 (MBW)", "BM-1080KS-04", "SE-1081KS-17", "SE-1081KS-03", "SE-1081KS-74", "SE-1081KS-13", "SE-1082KS-95 -(DRIVE)"],
  "SISTEMA 2": ["TR-1081KS-04", "TR-1081KS-52", "TR-1081KS-14 (bsm)", "TR-1081KS-05 (bsm)", "SE-1081KS-52", "SE-1081KS-04", "SE-1081KS-76", "BELTI EE-1080KS-02", "BM-1081KS-02", "SE-1081KS-50", "SE-1081KS-51", "SE-1081KS-56", "SE-1081KS-27", "SE-1081KS-97", "SE-1081KS-14", "SE-1081KS-18 (bsm)", "SE-1080KS-51 (bsm)"],
  "SISTEMA 3": ["TR-1081KS-11", "TR-1081KS-01", "BM-1081KS-03", "BELTI EE-1081KS03 (MBW)", "SE-1081KS-01", "SE-1081KS-70", "SE-1081KS-15", "SE-1081KS-21", "SE-1081KS-11", "SE-1081KS-91"],
  "SISTEMA 4": ["TR-1081KS-02", "TR-1081KS-12", "BM-1081KS-01", "BELTI EE-1081KS-01", "SE-1081KS-02", "SE-1081KS-72", "SE-1081KS-12", "SE-1081KS-23", "SE-1081KS-93"],
  "5ª BRITAGEM": ["BM-1080KS-13", "BM-1080KS-12", "BM-1080KS-11", "TR-1080KS-81", "TR-1085KS-36", "TR-1080KS-83", "TR-1080KS-88", "TR-1080KS-87", "TR-1080KS-82", "TR-1080KS-85", "TR-1080KS-86", "TR-1080KS-80", "TR-1080KS-84"],
  "CASA DE TRANSFERENCIA": ["TR-1082KS-01", "TR-1082KS-02", "TR-1082KS-03", "TR-1082KS-04", "TR-1082KS-05", "TR-1082KS-06", "TR-1080KS-37", "TR-1085KS-01", "TR-1085KS-04", "TR-1083KS-01", "TR-1084KS-01", "TR-1085KS-05", "SE-1084KS-01", "SE-1083KS-01", "SE-1082KS-02", "SE-1082KS-01", "SE-1085KS-23", "SE-1082KS-03", "SE-1082KS-04", "SE-6021KS-01", "SE-1085KS-22"],
  "OVERLAND": ["TR-1083KS-03", "TR-1083KS-04", "SE-1084KS-22", "SE-1084KS-21", "TR-1084KS-02", "TR-1083KS-02", "EE-1084KS-01 (mts)", "EE-1083KS-01 (mts)", "SE-1083KS-02", "SE-1084KS-02"]
};

const groupsConfig = {
  ctv: { id: 'ctv', label: 'CFTV', icon: Tv, textColor: 'text-blue-400', lightColor: 'bg-blue-500/10', gradient: 'from-blue-600 to-blue-800' },
  telecom: { id: 'telecom', label: 'Telecom', icon: Radio, textColor: 'text-indigo-400', lightColor: 'bg-indigo-500/10', gradient: 'from-indigo-600 to-indigo-800' },
  painel: { id: 'painel', label: 'Painéis', icon: Server, textColor: 'text-orange-400', lightColor: 'bg-orange-500/10', gradient: 'from-orange-600 to-orange-800' },
  embarcados: { id: 'embarcados', label: 'Embarcados', icon: Cpu, textColor: 'text-emerald-400', lightColor: 'bg-emerald-500/10', gradient: 'from-emerald-600 to-emerald-800' },
};

const formatDisplayTag = (str: string) => {
  if (!str) return "";
  let cleaned = str.split('|')[0].trim().replace(/^Item:\s*/i, '');
  let formatted = cleaned.toLowerCase();
  const numericMatch = formatted.match(/(.*)(\d{2})(\d{2})$/);
  if (numericMatch) {
    formatted = `${numericMatch[1]}${numericMatch[2]}.${numericMatch[3]}`;
  }
  return formatted;
};

const MiniMapPreview: React.FC<{ lat: number, lng: number }> = ({ lat, lng }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;
    if (mapInstance.current) {
        mapInstance.current.setView([lat, lng], 18);
        return;
    }
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([lat, lng], 18);
    L.tileLayer(GOOGLE_HYBRID_URL, { maxZoom: 22, maxNativeZoom: 19 }).addTo(map);
    L.circleMarker([lat, lng], { radius: 6, fillColor: '#3b82f6', color: '#fff', weight: 2, fillOpacity: 1 }).addTo(map);
    mapInstance.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    return () => { if (mapInstance.current) mapInstance.current.remove(); };
  }, [lat, lng]);

  return <div ref={mapRef} className="w-full h-full bg-slate-800 rounded-3xl overflow-hidden border border-slate-700 shadow-inner" />;
};

const GlobalMapModal: React.FC<{ items: GroupItem[], onClose: () => void, onSelectItem: (item: GroupItem) => void }> = ({ items, onClose, onSelectItem }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;
    const map = L.map(mapRef.current).setView([-15.78, -47.92], 4);
    L.tileLayer(GOOGLE_HYBRID_URL, { attribution: SATELLITE_ATTRIBUTION, maxZoom: 22, maxNativeZoom: 19 }).addTo(map);
    mapInstance.current = map;

    items.forEach(item => {
      const geo = item.data?.["Geolocalização"];
      if (geo) {
        const parts = geo.split(',').map((p: string) => parseFloat(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0])) {
          const [lat, lng] = parts;
          const config = (groupsConfig as any)[item.groupType || 'ctv'];
          const marker = L.circleMarker([lat, lng], { 
            radius: 8, 
            fillColor: config.textColor.includes('blue') ? '#3b82f6' : 
                       config.textColor.includes('indigo') ? '#6366f1' :
                       config.textColor.includes('orange') ? '#f97316' : '#10b981', 
            color: '#fff', 
            weight: 2, 
            fillOpacity: 1 
          }).addTo(map);
          marker.bindTooltip(formatDisplayTag(item.data?.["Tag"] || item.content), { permanent: true, className: 'tag-label', direction: 'top', offset: [0, -5] });
          marker.on('click', () => { onSelectItem(item); onClose(); });
        }
      }
    });

    setTimeout(() => map.invalidateSize(), 300);
    return () => { if (mapInstance.current) mapInstance.current.remove(); };
  }, [items]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-0 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 w-full h-full max-w-6xl max-h-[90vh] sm:rounded-[3rem] overflow-hidden flex flex-col border border-slate-700 shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl"><Globe className="w-5 h-5" /></div>
             <h3 className="text-sm font-black uppercase tracking-widest text-white">Monitor de Ativos Satélite</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={() => userPos && mapInstance.current?.setView(userPos, 18)} className="p-2.5 bg-blue-600 rounded-xl text-white active:scale-90 transition-all"><Locate size={22}/></button>
            <button onClick={onClose} className="p-2.5 bg-slate-800 rounded-xl text-slate-400 hover:text-white active:scale-90 transition-all"><X size={22}/></button>
          </div>
        </div>
        <div ref={mapRef} className="flex-1" />
      </div>
    </div>
  );
};

const ItemDetail: React.FC<{ item: GroupItem, groupKey: GroupType, config: any, onClose: () => void, onDelete: (id: string) => void }> = ({ item, groupKey, config, onClose, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>(item.data || {});
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(() => {
    const geo = item.data?.["Geolocalização"];
    if (geo) {
      const p = geo.split(',').map((s: string) => parseFloat(s.trim()));
      if (p.length === 2 && !isNaN(p[0])) return { lat: p[0], lng: p[1] };
    }
    return null;
  });
  const [capturing, setCapturing] = useState(false);
  const showGPS = groupKey === 'painel';

  const handleSave = async () => {
    const finalData = { ...editData };
    if (location && showGPS) {
      finalData["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
      finalData["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}`;
    }
    await updateDoc(doc(db, groupKey, item.id), { data: finalData, content: `Item: ${finalData["Tag"] || ""}` });
    setIsEditing(false);
  };

  const isFieldEmpty = (v: any) => v === undefined || v === null || String(v).trim() === "" || String(v).toLowerCase() === "--empty";

  const visibleEntries = Object.entries(editData).filter(([k, v]) => {
    const isSpecial = k === 'Geolocalização' || k === 'Link Maps';
    return !isSpecial && !isFieldEmpty(v);
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl animate-fadeIn w-full max-w-4xl mx-auto h-auto sm:max-h-[90vh]">
      <div className={`p-6 bg-gradient-to-r ${config.gradient} flex justify-between items-center text-white`}>
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><ArrowLeft size={20}/></button>
          <span className="text-lg font-black uppercase tracking-tighter">{formatDisplayTag(editData["Tag"] || item.content)}</span>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <button onClick={handleSave} className="p-3 bg-emerald-600 rounded-xl shadow-lg"><Save size={20}/></button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="p-3 bg-white/10 rounded-xl"><Edit size={20}/></button>
          )}
          <button onClick={() => confirm('Excluir Registro?') && onDelete(item.id)} className="p-3 bg-red-600/20 text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={20}/></button>
        </div>
      </div>
      
      <div className={`p-8 grid grid-cols-1 ${showGPS ? 'md:grid-cols-2' : ''} gap-8 overflow-y-auto`}>
        <div className="space-y-6">
          <div className="bg-slate-800/50 p-7 rounded-[2rem] border border-slate-700 shadow-inner">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2"><Database size={12} className="text-blue-500"/> Ficha Técnica do Ativo</h4>
            <div className="space-y-5">
              {/* Exclui os campos --empty mesmo no modo de edição para Telecom */}
              {visibleEntries.map(([k, v]) => {
                if (k === 'Geolocalização' || k === 'Link Maps') return null;
                return (
                  <div key={k} className="flex flex-col gap-1.5 border-b border-white/5 pb-2 last:border-0">
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{k}</span>
                    {isEditing ? (
                      <input type="text" value={String(v)} onChange={e => setEditData({...editData, [k]: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white uppercase outline-none focus:border-blue-500 shadow-inner" />
                    ) : (
                      <span className="text-sm font-bold text-white uppercase break-all">{String(v)}</span>
                    )}
                  </div>
                );
              })}
              {visibleEntries.length === 0 && !isEditing && (
                <p className="text-xs text-slate-600 font-bold uppercase italic text-center py-4">Nenhuma informação técnica preenchida</p>
              )}
            </div>
          </div>
        </div>

        {showGPS && (
          <div className="space-y-6">
            <div className="h-72 relative rounded-[2rem] overflow-hidden border border-slate-700 shadow-2xl">
              {location ? (
                <MiniMapPreview lat={location.lat} lng={location.lng} />
              ) : (
                <div className="w-full h-full bg-slate-800/50 flex flex-col items-center justify-center text-slate-600 gap-4">
                  <MapPinOff size={48} className="opacity-20" />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">GPS não vinculado</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-3">
              {isEditing ? (
                <button type="button" onClick={() => { setCapturing(true); navigator.geolocation.getCurrentPosition(p => { setLocation({lat:p.coords.latitude, lng:p.coords.longitude}); setCapturing(false); }, () => setCapturing(false), {enableHighAccuracy: true})}} className="w-full py-5 bg-blue-600 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
                  {capturing ? <Loader2 className="animate-spin" size={18}/> : location ? <CheckCircle size={18}/> : <Crosshair size={18}/>}
                  {capturing ? "Sincronizando Satélite..." : location ? "Atualizar Posição GPS" : "Capturar Geolocalização"}
                </button>
              ) : location && (
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`} target="_blank" className="w-full py-5 bg-emerald-600 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:brightness-110 active:scale-95 transition-all">
                  <Navigation2 size={18}/> Como Chegar (Rota)
                </a>
              )}
              {location && !isEditing && (
                 <p className="text-center text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">Coordenadas: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ItemCard: React.FC<{ item: GroupItem, onSelect: () => void, icon: any, lightColor: string, textColor: string }> = ({ item, onSelect, icon: Icon, lightColor, textColor }) => {
  const tagValue = formatDisplayTag(item.data?.["Tag"] || item.content);
  const hasGPS = !!item.data?.["Geolocalização"];

  return (
    <div onClick={onSelect} className="w-full bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 hover:bg-slate-800 hover:border-blue-500/50 transition-all cursor-pointer group flex items-center gap-5 shadow-lg active:scale-[0.99]">
      <div className={`p-3 rounded-2xl ${lightColor} ${textColor} flex-shrink-0 border border-white/5`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-[13px] font-black text-white tracking-tight truncate uppercase leading-none">{tagValue}</h3>
          {hasGPS && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_#10b981]" />}
        </div>
        {item.data?.["Local"] && (
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate">{item.data["Local"]}</p>
        )}
      </div>
      <ArrowRight size={20} className="text-slate-700 group-hover:text-blue-500 transition-colors" />
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [items, setItems] = useState<GroupItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GroupItem | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [loadingMap, setLoadingMap] = useState(false);
  const [mapItems, setMapItems] = useState<GroupItem[]>([]);

  useEffect(() => {
    const types: GroupType[] = ['ctv', 'telecom', 'painel', 'embarcados'];
    const unsubs = types.map(t => onSnapshot(collection(db, t), snap => {
      setItems(prev => {
        const other = prev.filter(i => i.groupType !== t);
        const news = snap.docs.map(d => ({ id: d.id, ...d.data(), groupType: t } as GroupItem));
        return [...other, ...news];
      });
    }));
    return () => unsubs.forEach(u => u());
  }, []);

  const openMap = async () => {
    setLoadingMap(true);
    const types: GroupType[] = ['ctv', 'telecom', 'painel', 'embarcados'];
    const results = await Promise.all(types.map(t => getDocs(collection(db, t))));
    const all = results.flatMap((snap, idx) => snap.docs.map(d => ({ id: d.id, ...d.data(), groupType: types[idx] } as GroupItem)));
    setMapItems(all);
    setIsMapModalOpen(true);
    setLoadingMap(false);
  };

  if (selectedItem) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <ItemDetail 
        item={selectedItem} 
        groupKey={selectedItem.groupType!} 
        config={(groupsConfig as any)[selectedItem.groupType!]} 
        onClose={() => setSelectedItem(null)} 
        onDelete={id => deleteDoc(doc(db, selectedItem.groupType!, id)).then(() => setSelectedItem(null))} 
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 p-6 sm:p-16 text-slate-200 relative overflow-hidden flex flex-col">
      <div className="absolute top-[-15%] right-[-10%] w-[60%] h-[60%] bg-blue-600/5 blur-[150px] rounded-full pointer-events-none"></div>
      
      {isMapModalOpen && <GlobalMapModal items={mapItems} onClose={() => setIsMapModalOpen(false)} onSelectItem={(i) => { setSelectedItem(i); setCurrentView(i.groupType as GroupType); }} />}

      <div className="max-w-6xl mx-auto w-full space-y-12 relative z-10 flex-1">
        <header className="flex flex-col gap-10">
          <div className="flex justify-between items-center">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] text-blue-400">
               TagFinder Enterprise v5.1
            </div>
            <button onClick={() => signOut(auth)} className="p-4 bg-slate-800 border border-slate-700 rounded-2xl text-slate-500 hover:text-red-500 transition-all shadow-xl active:scale-90"><LogOut size={24} /></button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
            <div>
              <h1 className="text-4xl sm:text-7xl font-black tracking-tighter uppercase leading-none">Olá, <span className="text-blue-500 drop-shadow-2xl">{user.email?.split('@')[0]}</span></h1>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mt-4 opacity-70">Painel Unificado de Ativos Satélite</p>
            </div>

            <button onClick={openMap} disabled={loadingMap} className="group bg-slate-800/80 p-8 sm:p-12 rounded-[3.5rem] border border-slate-700 shadow-2xl hover:border-blue-500/30 transition-all active:scale-95 text-left relative overflow-hidden">
               <div className="absolute top-0 right-0 p-24 bg-blue-600/10 rounded-full blur-[120px] -mr-12 -mt-12"></div>
               <div className="flex items-center gap-6 relative z-10">
                  <div className="p-5 bg-blue-500/10 text-blue-400 rounded-3xl group-hover:scale-110 transition-all shadow-xl">
                    {loadingMap ? <Loader2 className="animate-spin" size={32}/> : <Globe size={32} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter text-white">Mapa Satélite</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Localização de Ativos</p>
                  </div>
               </div>
            </button>
          </div>
        </header>

        {currentView === 'home' ? (
          <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
            {Object.entries(groupsConfig).map(([key, group]) => (
               <button key={key} onClick={() => setCurrentView(key as GroupType)} className="relative overflow-hidden group bg-slate-900/60 p-10 rounded-[2.5rem] border border-slate-800 flex flex-col items-start transition-all hover:bg-slate-800 active:scale-95 shadow-2xl">
                 <div className={`w-16 h-16 rounded-3xl ${group.lightColor} ${group.textColor} flex items-center justify-center mb-8 border border-white/5 transition-all group-hover:scale-110`}><group.icon size={32} /></div>
                 <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">{group.label}</h2>
                 <div className={`inline-flex items-center gap-3 text-[9px] font-black uppercase tracking-widest ${group.textColor} mt-4 opacity-60 group-hover:opacity-100 transition-opacity`}>Gerenciar Lista <ArrowRight size={14} /></div>
               </button>
            ))}
          </main>
        ) : (
          <GroupContent groupKey={currentView as GroupType} user={user} onBack={() => setCurrentView('home')} onSelectItem={setSelectedItem} />
        )}
      </div>

      <footer className="py-12 text-center border-t border-white/5 mt-auto">
        <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] opacity-50">TagFinder Enterprise Cloud &copy; 2024</p>
      </footer>
    </div>
  );
};

const GroupContent: React.FC<{ groupKey: GroupType, user: User, onBack: () => void, onSelectItem: (i: GroupItem) => void }> = ({ groupKey, user, onBack, onSelectItem }) => {
  const config = (groupsConfig as any)[groupKey];
  const [items, setItems] = useState<GroupItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewModal, setIsNewModal] = useState(false);
  const [formData, setFormData] = useState<any>({ tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', equipamento: '', obs: '' });
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [capturing, setCapturing] = useState(false);
  const showGPSInput = groupKey === 'painel';

  useEffect(() => {
    return onSnapshot(collection(db, groupKey), snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data(), groupType: groupKey } as GroupItem))));
  }, [groupKey]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTag = formData.tag || formData.equipamento;
    let data: any = { "Tag": finalTag, "Local": formData.local || "" };
    
    if (groupKey === 'painel') {
      data = { 
        ...data, 
        "Switch1": formData.switch1 || "", 
        "Switch2": formData.switch2 || "", 
        "Switch3": formData.switch3 || "", 
        "Equipamento": formData.equipamento || "",
        "Observação": formData.obs || ""
      };
    } else {
      data = { ...data, "IP": formData.ip || "" };
    }
    
    if (location && showGPSInput) {
      data["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
      data["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}`;
    }

    await addDoc(collection(db, groupKey), { data, content: `Item: ${finalTag}`, userId: user.uid, createdAt: serverTimestamp() });
    setIsNewModal(false);
    setFormData({ tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', equipamento: '', obs: '' });
    setLocation(null);
  };

  const filtered = items.filter(i => formatDisplayTag(i.data?.["Tag"] || i.content).includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-4 bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all shadow-xl"><ArrowLeft size={24}/></button>
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{config.label}</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">{items.length} Registros</p>
          </div>
        </div>
        <div className="flex gap-4 flex-1 max-w-xl">
          <div className="relative flex-1 group">
             <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
             <input type="text" placeholder="Filtrar Ativos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold uppercase outline-none focus:border-blue-500 shadow-xl" />
          </div>
          <button onClick={() => setIsNewModal(true)} className={`p-4 rounded-2xl text-white bg-gradient-to-r ${config.gradient} shadow-xl active:scale-95 transition-all`}><Plus size={24}/></button>
        </div>
      </div>

      <div className="flex flex-col gap-4 max-w-4xl mx-auto">
        {filtered.map(i => <ItemCard key={i.id} item={i} onSelect={() => onSelectItem(i)} icon={config.icon} lightColor={config.lightColor} textColor={config.textColor} />)}
        {filtered.length === 0 && (
          <div className="text-center py-24 opacity-20 flex flex-col items-center gap-4">
            <Search size={48} />
            <p className="font-black uppercase tracking-[0.2em] text-xs">Nenhum registro encontrado</p>
          </div>
        )}
      </div>

      {isNewModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-900 w-full max-w-sm border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className={`p-7 bg-gradient-to-r ${config.gradient} flex justify-between items-center text-white flex-shrink-0`}>
              <span className="text-sm font-black uppercase tracking-widest">Novo Ativo {config.label}</span>
              <button onClick={() => setIsNewModal(false)} className="p-2 bg-white/10 rounded-xl"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="p-7 space-y-5 overflow-y-auto">
              <input type="text" placeholder="Tag Identificação" required value={formData.tag} onChange={(e) => setFormData({...formData, tag: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-sm text-white uppercase outline-none focus:border-blue-500 shadow-inner" />
              
              {groupKey === 'painel' ? (
                <>
                  <div className="grid grid-cols-1 gap-4">
                    <input type="text" placeholder="Switch 1" value={formData.switch1} onChange={(e) => setFormData({...formData, switch1: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-sm text-white uppercase outline-none shadow-inner" />
                    <input type="text" placeholder="Switch 2" value={formData.switch2} onChange={(e) => setFormData({...formData, switch2: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-sm text-white uppercase outline-none shadow-inner" />
                    <input type="text" placeholder="Switch 3" value={formData.switch3} onChange={(e) => setFormData({...formData, switch3: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-sm text-white uppercase outline-none shadow-inner" />
                  </div>
                  
                  <select value={formData.local} onChange={(e) => setFormData({...formData, local: e.target.value, equipamento: ''})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-sm text-white uppercase outline-none focus:border-blue-500 shadow-inner appearance-none cursor-pointer">
                    <option value="">Selecione Local...</option>
                    {Object.keys(SYSTEM_DATA).map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  
                  <select value={formData.equipamento} disabled={!formData.local} onChange={(e) => setFormData({...formData, equipamento: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-sm text-white uppercase outline-none focus:border-blue-500 shadow-inner appearance-none disabled:opacity-30 cursor-pointer">
                    <option value="">Selecione Equipamento...</option>
                    {formData.local && SYSTEM_DATA[formData.local]?.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                  </select>

                  <div className="relative">
                    <textarea placeholder="Observações" value={formData.obs} onChange={(e) => setFormData({...formData, obs: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-sm text-white uppercase outline-none focus:border-blue-500 shadow-inner h-24 resize-none" />
                    <MessageSquare size={16} className="absolute right-4 bottom-4 text-slate-600 pointer-events-none" />
                  </div>
                </>
              ) : (
                <>
                  <input type="text" placeholder="IP / Identificador" value={formData.ip} onChange={(e) => setFormData({...formData, ip: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-sm text-white uppercase font-mono outline-none shadow-inner" />
                  <input type="text" placeholder="Localização Técnica" value={formData.local} onChange={(e) => setFormData({...formData, local: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-sm text-white uppercase outline-none shadow-inner" />
                </>
              )}
              
              {showGPSInput && (
                <button type="button" onClick={() => { setCapturing(true); navigator.geolocation.getCurrentPosition(p => { setLocation({lat:p.coords.latitude, lng:p.coords.longitude}); setCapturing(false); }, () => setCapturing(false), {enableHighAccuracy: true})}} className="w-full py-4 bg-slate-800 border border-slate-700 rounded-xl text-[10px] font-black uppercase text-blue-400 flex items-center justify-center gap-3 active:scale-95 transition-all">
                  {capturing ? <Loader2 className="animate-spin" size={16}/> : location ? <CheckCircle size={16} className="text-emerald-500"/> : <Crosshair size={16}/>}
                  {capturing ? "Sincronizando..." : location ? "GPS Sincronizado" : "Capturar Geolocalização"}
                </button>
              )}

              <button type="submit" className={`w-full py-6 bg-gradient-to-r ${config.gradient} rounded-[1.5rem] text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all`}>Registrar Ativo</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
