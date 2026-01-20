import React, { useState, useEffect, useRef } from 'react';
import { User, signOut } from 'firebase/auth';
import * as firestore from 'firebase/firestore';

const { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  deleteDoc, 
  updateDoc, 
  doc, 
  writeBatch,
  Timestamp
} = firestore as any;

import { auth, db } from '../services/firebase';
import { 
  LogOut, Tv, Radio, Cpu, ArrowLeft, ArrowRight, Search, Plus, Save, 
  MapPin, Loader2, Edit, X, Globe, Trash2, Crosshair, Server, 
  CheckCircle, Database, Clock, Activity, Locate, 
  FilterX, IdCard, Link, FileText, Download, Eye, 
  Signal, Upload, MessageSquare, Navigation, ExternalLink, FileDown
} from 'lucide-react';
import * as XLSX from 'xlsx';

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
  createdAt: any | null;
  groupType?: GroupType;
}

type GroupType = 'ctv' | 'telecom' | 'embarcados' | 'painel' | 'tw_local' | 'downloads';
type ViewState = 'home' | GroupType;

const GOOGLE_HYBRID_URL = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
const SATELLITE_ATTRIBUTION = '&copy; Google Maps';

const SYSTEM_DATA: Record<string, string[]> = {
  "5ª BRITAGEM": ["bm-1080ks-11", "bm-1080ks-12", "bm-1080ks-13", "tr-1080ks-80", "tr-1080ks-81", "tr-1080ks-82", "tr-1080ks-83", "tr-1080ks-84", "tr-1085ks-36"],
  "CASA DE TRANSFERENCIA": ["ee-1084ks-01", "se-1082ks-01", "se-1082ks-02", "se-1082ks-03", "se-1082ks-04", "tr-1080ks-37", "tr-1082ks-01"],
  "OVERLAND": ["ee-1083ks-01", "ee-1084ks-01", "se-1083ks-02"],
  "SISTEMA 1": ["vc-1080ks-13.06", "bm-1080ks-04"],
  "SISTEMA 2": ["ee-1080ks-02", "bm-1081ks-02"],
  "SISTEMA 3": ["ee-1081ks-03", "bm-1081ks-03"],
  "SISTEMA 4": ["ee-1081ks-01", "bm-1081ks-01"]
};

const groupsConfig = {
  ctv: { id: 'ctv', label: 'CFTV', icon: Tv, color: 'bg-blue-600', textColor: 'text-blue-400', lightColor: 'bg-blue-900/30', borderColor: 'border-blue-800/50', gradient: 'from-blue-600 to-blue-800' },
  telecom: { id: 'telecom', label: 'Telecom', icon: Radio, color: 'bg-indigo-600', textColor: 'text-indigo-400', lightColor: 'bg-indigo-900/30', borderColor: 'border-indigo-800/50', gradient: 'from-indigo-600 to-indigo-800' },
  painel: { id: 'painel', label: 'Painéis', icon: Server, color: 'bg-orange-600', textColor: 'text-orange-400', lightColor: 'bg-orange-900/30', borderColor: 'border-orange-800/50', gradient: 'from-orange-600 to-orange-800' },
  embarcados: { id: 'embarcados', label: 'Embarcados', icon: Cpu, color: 'bg-emerald-600', textColor: 'text-emerald-400', lightColor: 'bg-emerald-900/30', borderColor: 'border-emerald-800/50', gradient: 'from-emerald-600 to-emerald-800' },
  tw_local: { id: 'tw_local', label: 'Local TW', icon: Locate, color: 'bg-purple-600', textColor: 'text-purple-400', lightColor: 'bg-purple-900/30', borderColor: 'border-purple-800/50', gradient: 'from-purple-600 to-purple-800' },
  downloads: { id: 'downloads', label: 'Downloads', icon: Download, color: 'bg-cyan-600', textColor: 'text-cyan-400', lightColor: 'bg-cyan-900/30', borderColor: 'border-cyan-800/50', gradient: 'from-cyan-600 to-cyan-800' },
};

const normalizeText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const cleanTagName = (tag: string) => {
  if (!tag) return "";
  const s = String(tag);
  return s.split('|')[0].trim();
};

const isKeyVisible = (k: string) => {
  if (!k) return false;
  const key = k.toUpperCase();
  return !key.includes('__EMPTY') && !key.includes('GEOLOCALIZAÇÃO') && !key.includes('LINK MAPS') && k.trim() !== "";
};

const HighlightedText: React.FC<{ text: string; highlight: string; className?: string }> = ({ text, highlight, className = "" }) => {
  if (!highlight.trim()) return <span className={className}>{text}</span>;
  const terms = highlight.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  if (terms.length === 0) return <span className={className}>{text}</span>;
  const pattern = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);
  return (
    <span className={className}>
      {parts.map((part, i) => regex.test(part) ? (
        <mark key={i} className="bg-blue-500/40 text-white rounded px-0.5 font-bold shadow-sm inline-block">{part}</mark>
      ) : part)}
    </span>
  );
};

const MiniMapPreview: React.FC<{ lat: number, lng: number, tag: string }> = ({ lat, lng, tag }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;
    if (mapInstance.current) {
        mapInstance.current.setView([lat, lng], 18);
        return;
    }
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, touchZoom: false }).setView([lat, lng], 18);
    L.tileLayer(GOOGLE_HYBRID_URL, { maxZoom: 22, maxNativeZoom: 20, detectRetina: true }).addTo(map);
    L.circleMarker([lat, lng], { radius: 6, fillColor: '#3b82f6', color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 1 }).addTo(map);
    mapInstance.current = map;
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [lat, lng, tag]);

  return <div ref={mapRef} className="w-full h-40 rounded-2xl border border-slate-700 shadow-inner overflow-hidden mt-2" />;
};

const GlobalMapModal: React.FC<{ items: GroupItem[], onClose: () => void, onSelectItem: (item: GroupItem) => void }> = ({ items, onClose, onSelectItem }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;
    const map = L.map(mapRef.current, { zoomControl: false, maxZoom: 22 }).setView([-15.7801, -47.9292], 4);
    L.tileLayer(GOOGLE_HYBRID_URL, { maxZoom: 22, maxNativeZoom: 20, detectRetina: true, attribution: SATELLITE_ATTRIBUTION }).addTo(map);
    layerGroupRef.current = L.layerGroup().addTo(map);
    mapInstance.current = map;
    setTimeout(() => map.invalidateSize(), 400);
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !layerGroupRef.current) return;
    layerGroupRef.current.clearLayers();
    const bounds = L.latLngBounds([]);
    let hasGeo = false;

    items.forEach(item => {
      const geo = item.data?.["Geolocalização"];
      if (geo) {
        const parts = geo.split(',').map((p: string) => parseFloat(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const [lat, lng] = parts;
          let color = '#3b82f6';
          if (item.groupType === 'telecom') color = '#6366f1';
          if (item.groupType === 'painel') color = '#f97316';
          if (item.groupType === 'embarcados') color = '#10b981';
          if (item.groupType === 'tw_local') color = '#a855f7';
          if (item.groupType === 'downloads') color = '#06b6d4';
          const marker = L.circleMarker([lat, lng], { radius: 8, fillColor: color, color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 1 });
          marker.bindTooltip(cleanTagName(item.data?.["Tag"] || "Item"), { permanent: true, direction: 'top', className: 'tag-label', offset: [0, -8] });
          layerGroupRef.current.addLayer(marker);
          bounds.extend([lat, lng]);
          hasGeo = true;
        }
      }
    });
    if (hasGeo) mapInstance.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 18 });
  }, [items]);

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md">
      <div className="bg-slate-900 w-full h-[100vh] sm:h-[90vh] sm:max-w-6xl sm:rounded-[2.5rem] overflow-hidden flex flex-col border border-slate-700 shadow-2xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 backdrop-blur-xl relative z-20">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20"><Globe size={20} /></div>
             <div><h3 className="font-black text-white text-base tracking-tighter uppercase leading-none">Mapa Geral Satélite</h3><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Google Earth Engine</p></div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all border border-slate-700 text-slate-400"><X size={24} /></button>
        </div>
        <div className="flex-1 relative bg-black"><div ref={mapRef} className="absolute inset-0 z-0" /></div>
      </div>
    </div>
  );
};

const ItemCard: React.FC<{ item: GroupItem; config: any; onSelect: () => void; onDelete: (id: string) => void; searchHighlight: string; }> = ({ item, config, onSelect, onDelete, searchHighlight }) => {
  const data = item.data || {};
  const isPainel = config.id === 'painel';
  const isTW = config.id === 'tw_local';
  const isDownload = config.id === 'downloads';
  const tagValue = cleanTagName(data["Tag"] || data["Nome"] || item.content.replace(/^Item:\s*/i, ''));
  const hasGeo = !!data["Geolocalização"];

  return (
    <div onClick={onSelect} className="relative flex flex-col bg-slate-800/40 backdrop-blur-xl rounded-[1.5rem] border border-slate-700/60 p-1 shadow-lg hover:shadow-2xl transition-all cursor-pointer active:scale-95 group overflow-hidden">
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-white truncate tracking-tighter uppercase group-hover:text-blue-400 transition-colors flex-1">
            <HighlightedText text={tagValue} highlight={searchHighlight} />
          </h3>
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); if(confirm("Deseja excluir?")) onDelete(item.id); }} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={16} /></button>
            <div className={`p-2 rounded-lg ${hasGeo || isDownload ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}><MapPin size={14} /></div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400 bg-slate-900/30 px-3 py-1.5 rounded-lg border border-white/5">
          <span className="text-[9px] font-black uppercase"><HighlightedText text={data["Local"] || data["Categoria"] || "S/ LOCAL"} highlight={searchHighlight} /></span>
        </div>
        <div className="flex items-center justify-between text-[8px] font-black text-slate-500 pt-2 border-t border-white/5 uppercase mt-auto">
           <div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${hasGeo ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>{config.label}</div>
           <span>{hasGeo ? 'GPS OK' : 'SEM GPS'}</span>
        </div>
      </div>
    </div>
  );
};

const GroupPage: React.FC<{ groupKey: GroupType; user: User; onBack: () => void; initialSelectedItem?: GroupItem | null }> = ({ groupKey, user, onBack, initialSelectedItem }) => {
  const config = groupsConfig[groupKey];
  const Icon = config.icon;
  const [items, setItems] = useState<GroupItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GroupItem | null>(initialSelectedItem || null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({ tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', equipamento: '', obs: '', desc: '', link: '', nome: '' });
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, groupKey), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })) as GroupItem[]));
  }, [groupKey]);

  const handleGetLocation = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGettingLocation(false); },
      () => { setGettingLocation(false); alert('GPS Falhou'); },
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let data: any = {};
      if (groupKey === 'painel') {
          data = { "Tag": formData.tag, "Local": formData.local, "Switch1": formData.switch1, "Switch2": formData.switch2, "Switch3": formData.switch3, "Equipamento": formData.equipamento, "Observação": formData.obs };
      } else if (groupKey === 'downloads') {
          data = { "Nome": formData.nome, "Categoria": formData.local, "Link": formData.link, "Descrição": formData.desc };
      } else {
          data = { "Tag": formData.tag, "Local": formData.local, "IP / Equipamento": formData.ip };
      }

      if (location && groupKey !== 'downloads') {
          data["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
          data["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}`;
      }
      
      await addDoc(collection(db, groupKey), { content: `Item: ${formData.tag || formData.nome}`, data, userId: user.uid, userEmail: user.email, createdAt: serverTimestamp() });
      setIsModalOpen(false);
      setFormData({ tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', equipamento: '', obs: '', desc: '', link: '', nome: '' });
      setLocation(null);
    } catch (e) { alert('Erro ao salvar'); } finally { setLoading(false); }
  };

  const handleDeleteItem = async (id: string) => {
    try { await deleteDoc(doc(db, groupKey, id)); } catch (e) { alert("Erro ao excluir."); }
  };

  const filteredItems = items.filter(item => {
    const s = normalizeText(searchTerm.trim());
    if (!s) return true;
    const searchable = [item.content, ...(item.data ? Object.values(item.data) : [])].map(v => normalizeText(String(v))).join(" ");
    return s.split(/\s+/).every(t => searchable.includes(t));
  });

  return (
    <div className="pb-24">
      <div className="p-6 sm:p-10 mb-8 bg-slate-800/60 rounded-[2.5rem] border border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-700 rounded-xl text-slate-300"><ArrowLeft size={24} /></button>
          <div>
            <span className="text-[9px] uppercase font-black text-slate-500">{config.label}</span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">{groupKey === 'downloads' ? 'Arquivos' : 'Inventário'}</h2>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className={`px-6 py-3 rounded-xl text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-[10px] flex items-center gap-2 shadow-xl`}>
          <Plus size={16} /> Novo Registro
        </button>
      </div>

      <div className="relative mb-8 max-w-4xl mx-auto">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input type="text" placeholder={`Buscar em ${config.label}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-slate-800/80 border border-slate-700 rounded-3xl text-white outline-none" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {filteredItems.map(item => <ItemCard key={item.id} item={item} config={config} onDelete={handleDeleteItem} onSelect={() => setSelectedItem(item)} searchHighlight={searchTerm} />)}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-slate-800 w-full max-w-lg sm:rounded-[2.5rem] border border-slate-600 overflow-y-auto max-h-[90vh]">
            <div className={`p-6 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-10`}><h3 className="font-black uppercase">Novo Registro</h3><button onClick={() => setIsModalOpen(false)}><X size={20} /></button></div>
            <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6">
              {groupKey === 'painel' ? (
                <div className="space-y-6">
                  {/* GPS NO TOPO */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2"><MapPin size={12} /> Sincronização GPS</label>
                    <button type="button" onClick={handleGetLocation} className="w-full py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-[9px] font-black uppercase text-blue-400 flex items-center justify-center gap-3">
                      {gettingLocation ? <Loader2 className="animate-spin" size={16}/> : location ? <CheckCircle className="text-emerald-500" size={16}/> : <Crosshair size={16}/>}
                      {location ? "GPS OK" : "ATIVAR GPS"}
                    </button>
                    {location && <MiniMapPreview lat={location.lat} lng={location.lng} tag={formData.tag} />}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Tag do Painel</label>
                    <input type="text" placeholder="Ex: vc-1080ks" required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-base font-black outline-none uppercase" />
                  </div>

                  {/* SWITCHES LOGO ABAIXO DA TAG */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Switch 1</label>
                      <input type="text" placeholder="IP/TAG" value={formData.switch1} onChange={e => setFormData({...formData, switch1: e.target.value})} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-[10px] font-black outline-none uppercase" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Switch 2</label>
                      <input type="text" placeholder="IP/TAG" value={formData.switch2} onChange={e => setFormData({...formData, switch2: e.target.value})} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-[10px] font-black outline-none uppercase" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Switch 3</label>
                      <input type="text" placeholder="IP/TAG" value={formData.switch3} onChange={e => setFormData({...formData, switch3: e.target.value})} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-[10px] font-black outline-none uppercase" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Local / Sistema</label>
                    <select value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-xs font-black uppercase outline-none">
                      <option value="">Selecione Local...</option>
                      {Object.keys(SYSTEM_DATA).map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Equipamento</label>
                    <input type="text" placeholder="Equipamento" value={formData.equipamento} onChange={e => setFormData({...formData, equipamento: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-xs font-black outline-none uppercase" />
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 ml-1 uppercase">Identificador</label>
                      <input type="text" required value={formData.tag || formData.nome} onChange={e => groupKey === 'downloads' ? setFormData({...formData, nome: e.target.value}) : setFormData({...formData, tag: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white outline-none" />
                  </div>
                  <button type="button" onClick={handleGetLocation} className="w-full py-4 bg-slate-700 rounded-xl text-[10px] font-black uppercase text-blue-400 flex items-center justify-center gap-2">
                    <Crosshair size={14}/> CAPTURAR GPS
                  </button>
                </div>
              )}
              <button type="submit" disabled={loading} className={`w-full py-5 rounded-2xl text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-[10px] shadow-2xl`}>
                 {loading ? <Loader2 className="animate-spin" size={20}/> : "SALVAR"}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-[300] bg-slate-900 overflow-y-auto">
          <div className={`p-6 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center`}>
            <button onClick={() => setSelectedItem(null)} className="p-2 bg-white/20 rounded-xl"><ArrowLeft size={24} /></button>
            <h2 className="font-black uppercase">{selectedItem.data?.["Tag"] || "Detalhes"}</h2>
            <button onClick={() => { if(confirm("Excluir?")) { handleDeleteItem(selectedItem.id); setSelectedItem(null); } }} className="p-2 bg-red-500/20 rounded-xl"><Trash2 size={24} /></button>
          </div>
          <div className="p-6 space-y-8">
             {selectedItem.data?.["Geolocalização"] && (
               <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase mb-2">Localização</h4>
                  <p className="text-sm font-mono text-emerald-400">{selectedItem.data["Geolocalização"]}</p>
                  <button onClick={() => window.open(selectedItem.data?.["Link Maps"], '_blank')} className="mt-4 w-full py-4 bg-blue-600 rounded-2xl font-black text-[10px] uppercase">Ver no Google Maps</button>
               </div>
             )}
             <div className="grid grid-cols-1 gap-4">
                {Object.entries(selectedItem.data || {}).map(([k, v]) => isKeyVisible(k) && (
                  <div key={k} className="bg-slate-800/40 p-4 rounded-xl border border-slate-700">
                    <h5 className="text-[8px] font-black text-slate-600 uppercase mb-1">{k}</h5>
                    <p className="text-white font-bold uppercase">{String(v)}</p>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [allData, setAllData] = useState<GroupItem[]>([]);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  useEffect(() => {
    const colls = ['ctv', 'telecom', 'painel', 'embarcados', 'tw_local', 'downloads'];
    const unsubs = colls.map((c, idx) => 
      onSnapshot(collection(db, c), (snap) => {
        const newItems = snap.docs.map(d => ({ id: d.id, ...d.data(), groupType: colls[idx] as GroupType } as GroupItem));
        setAllData(prev => {
          const other = prev.filter(i => i.groupType !== colls[idx]);
          return [...other, ...newItems];
        });
      })
    );
    return () => unsubs.forEach(u => u());
  }, []);

  if (currentView !== 'home') return <div className="min-h-screen bg-slate-900 p-4 sm:p-12"><div className="max-w-7xl mx-auto"><GroupPage groupKey={currentView} user={user} onBack={() => setCurrentView('home')} /></div></div>;

  return (
    <div className="min-h-screen bg-slate-900 p-6 sm:p-14 text-white flex flex-col">
      {isMapModalOpen && <GlobalMapModal items={allData} onClose={() => setIsMapModalOpen(false)} onSelectItem={() => {}} />}
      <div className="max-w-6xl mx-auto w-full space-y-12 flex-1">
        <header className="flex justify-between items-center">
          <div><h1 className="text-3xl font-black uppercase leading-tight">Olá, <span className="text-blue-500">{user.email?.split('@')[0]}</span></h1></div>
          <div className="flex gap-2">
            <button onClick={() => setIsMapModalOpen(true)} className="p-4 bg-blue-600/10 text-blue-400 rounded-2xl border border-blue-500/20"><Globe size={22} /></button>
            <button onClick={() => signOut(auth)} className="p-4 bg-slate-800 rounded-2xl text-slate-500"><LogOut size={22} /></button>
          </div>
        </header>
        <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
          {Object.entries(groupsConfig).map(([key, group]) => (
             <button key={key} onClick={() => setCurrentView(key as GroupType)} className="bg-slate-900/60 p-6 rounded-[2rem] border border-slate-800 flex flex-col items-start transition-all hover:bg-slate-800">
               <div className={`w-12 h-12 rounded-2xl ${group.lightColor} ${group.textColor} flex items-center justify-center mb-6`}><group.icon size={28} /></div>
               <h2 className="text-xs sm:text-lg font-black tracking-tighter uppercase">{group.label}</h2>
               <div className={`flex items-center gap-2 font-black text-[7px] ${group.textColor} opacity-60 mt-2`}>Acessar <ArrowRight size={12} /></div>
             </button>
          ))}
        </section>
      </div>
      <footer className="py-12 text-center opacity-40"><p className="text-[9px] font-black uppercase">TagFinder Enterprise &bull; 2024</p></footer>
    </div>
  );
};

export default Dashboard;