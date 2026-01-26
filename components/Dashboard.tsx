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
  updateDoc, 
  doc, 
  writeBatch,
} = firestore as any;

import { auth, db } from '../services/firebase';
import { 
  LogOut, Tv, Radio, Cpu, ArrowLeft, ArrowRight, Search, Plus, Save, 
  MapPin, Loader2, Edit, X, Globe, Crosshair, Server, 
  CheckCircle, Database, Clock, Activity, Locate, 
  FilterX, IdCard, Link, FileText, Download, Eye, 
  Signal, Upload, MessageSquare, Navigation, ExternalLink, FileDown, Sun, Moon
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
  "SISTEMA 1": ["TR-1081KS-03 (BC)", "TR-1082KS-13 (BCC)", "BELTI EE-1080KS-04 (MBW)", "BM-1080KS-04", "SE-1081KS-17", "SE-1081KS-03", "SE-1081KS-74", "SE-1081KS-13", "SE-1082KS-95 -(DRIVE)"],
  "SISTEMA 2": ["TR-1081KS-04", "TR-1081KS-52", "TR-1081KS-14 (bsm)", "TR-1081KS-05 (bsm)", "SE-1081KS-52", "SE-1081KS-04", "SE-1081KS-76", "BELTI EE-1080KS-02", "BM-1081KS-02", "SE-1081KS-50", "SE-1081KS-51", "SE-1081KS-56", "SE-1081KS-27", "SE-1081KS-97", "SE-1081KS-14", "SE-1081KS-18 (bsm)", "SE-1080KS-51 (bsm)"],
  "SISTEMA 3": ["TR-1081KS-11", "TR-1081KS-01", "BM-1081KS-03", "BELTI EE-1081KS03 (MBW)", "SE-1081KS-01", "SE-1081KS-70", "SE-1081KS-15", "SE-1081KS-21", "SE-1081KS-11", "SE-1081KS-91"],
  "SISTEMA 4": ["TR-1081KS-02", "TR-1081KS-12", "BM-1081KS-01", "BELTI EE-1081KS-01", "SE-1081KS-02", "SE-1081KS-72", "SE-1081KS-12", "SE-1081KS-23", "SE-1081KS-93"],
  "5ª BRITAGEM": ["BM-1080KS-13", "BM-1080KS-12", "BM-1080KS-11", "TR-1080KS-81", "TR-1085KS-36", "TR-1080KS-83", "TR-1080KS-88", "TR-1080KS-87", "TR-1080KS-82", "TR-1080KS-85", "TR-1080KS-86", "TR-1080KS-80", "TR-1080KS-84"],
  "CASA DE TRANSFERENCIA": ["TR-1082KS-01", "TR-1082KS-02", "TR-1082KS-03", "TR-1082KS-04", "TR-1082KS-05", "TR-1082KS-06", "TR-1080KS-37", "TR-1085KS-01", "TR-1085KS-04", "TR-1083KS-01", "TR-1084KS-01", "TR-1085KS-05", "SE-1084KS-01", "SE-1083KS-01", "SE-1082KS-02", "SE-1082KS-01", "SE-1085KS-23", "SE-1082KS-03", "SE-1082KS-04", "SE-6021KS-01", "SE-1085KS-22"],
  "OVERLAND": ["TR-1083KS-03", "TR-1083KS-04", "SE-1084KS-22", "SE-1084KS-21", "TR-1084KS-02", "TR-1083KS-02", "EE-1084KS-01 (mts)", "EE-1083KS-01 (mts)", "SE-1083KS-02", "SE-1084KS-02"]
};

const groupsConfig = {
  ctv: { id: 'ctv', label: 'CFTV', icon: Tv, color: 'bg-blue-600', textColor: 'text-blue-600 dark:text-blue-400', lightColor: 'bg-blue-50 dark:bg-blue-900/20', borderColor: 'border-blue-100 dark:border-blue-800/30', gradient: 'from-blue-600 to-blue-700' },
  telecom: { id: 'telecom', label: 'Telecom', icon: Radio, color: 'bg-indigo-600', textColor: 'text-indigo-600 dark:text-indigo-400', lightColor: 'bg-indigo-50 dark:bg-indigo-900/20', borderColor: 'border-indigo-100 dark:border-indigo-800/30', gradient: 'from-indigo-600 to-indigo-700' },
  painel: { id: 'painel', label: 'Painéis', icon: Server, color: 'bg-orange-600', textColor: 'text-orange-600 dark:text-orange-400', lightColor: 'bg-orange-50 dark:bg-orange-900/20', borderColor: 'border-orange-100 dark:border-orange-800/30', gradient: 'from-orange-600 to-orange-700' },
  embarcados: { id: 'embarcados', label: 'Embarcados', icon: Cpu, color: 'bg-emerald-600', textColor: 'text-emerald-600 dark:text-emerald-400', lightColor: 'bg-emerald-50 dark:bg-emerald-900/20', borderColor: 'border-emerald-100 dark:border-emerald-800/30', gradient: 'from-emerald-600 to-emerald-700' },
  tw_local: { id: 'tw_local', label: 'Local TW', icon: Locate, color: 'bg-purple-600', textColor: 'text-purple-600 dark:text-purple-400', lightColor: 'bg-purple-50 dark:bg-purple-900/20', borderColor: 'border-purple-100 dark:border-purple-800/30', gradient: 'from-purple-600 to-purple-700' },
  downloads: { id: 'downloads', label: 'Downloads', icon: Download, color: 'bg-cyan-600', textColor: 'text-cyan-600 dark:text-cyan-400', lightColor: 'bg-cyan-50 dark:bg-cyan-900/20', borderColor: 'border-cyan-100 dark:border-cyan-800/30', gradient: 'from-cyan-600 to-cyan-700' },
};

const normalizeText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const cleanTagName = (tag: string) => {
  if (!tag) return "";
  return String(tag).replace(/^(Item|Tag|Ativo|ITEM|TW):\s*/gi, '').split('|')[0].trim();
};

const isKeyVisible = (k: string) => {
  if (!k) return false;
  const key = k.toUpperCase();
  return !key.includes('__EMPTY') && !key.includes('GEOLOCALIZAÇÃO') && !key.includes('LINK MAPS') && !key.includes('ITEM') && k.trim() !== "";
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
        <mark key={i} className="bg-blue-600 text-white rounded px-0.5 font-bold inline-block">{part}</mark>
      ) : part)}
    </span>
  );
};

const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };
  return (
    <button onClick={toggle} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 dark:text-slate-400 shadow-sm active:scale-95 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
      {isDark ? <Sun size={24} /> : <Moon size={24} />}
    </button>
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

  return <div ref={mapRef} className="w-full h-48 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-4" />;
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
          const tagToDisplay = cleanTagName(item.data?.["Tag"] || item.data?.["Tag do Painel"] || item.data?.["Nome"] || "S/ TAG");
          const marker = L.circleMarker([lat, lng], { radius: 10, fillColor: color, color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 1 });
          marker.bindTooltip(tagToDisplay, { permanent: true, direction: 'top', className: `tag-label tag-label-${item.groupType}`, offset: [0, -14] });
          marker.on('click', () => onSelectItem(item));
          layerGroupRef.current.addLayer(marker);
          bounds.extend([lat, lng]);
          hasGeo = true;
        }
      }
    });
    if (hasGeo) mapInstance.current.fitBounds(bounds, { padding: [100, 100], maxZoom: 18 });
  }, [items]);

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 w-full h-[100vh] sm:h-[90vh] sm:max-w-6xl sm:rounded-[2.5rem] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 relative z-20">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-800/30"><Globe size={20} /></div>
             <div><h3 className="font-black text-slate-900 dark:text-white text-base tracking-tighter uppercase leading-none">Navegação Industrial</h3><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Satellite Intelligence System</p></div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"><X size={24} /></button>
        </div>
        <div className="flex-1 relative bg-slate-100 dark:bg-slate-950 map-vignette transition-colors"><div ref={mapRef} className="absolute inset-0 z-0" /></div>
      </div>
    </div>
  );
};

const ItemDetail: React.FC<{ item: GroupItem; groupKey: string; config: any; user: User; onClose: () => void; }> = ({ item, groupKey, config, user, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>(() => {
    const filtered: Record<string, any> = {};
    Object.entries(item.data || {}).forEach(([k, v]) => { if (isKeyVisible(k)) filtered[k] = v; });
    return filtered;
  });
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(() => {
     if (item.data?.["Geolocalização"]) {
         const parts = String(item.data["Geolocalização"]).split(',');
         if (parts.length === 2) return { lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) };
     }
     return null;
  });

  const isDownload = groupKey === 'downloads';
  const originalLink = item.data?.["Link"] || "";
  const driveId = (url: string) => { const regex = /(?:\/d\/|id=)([\w-]+)/; const match = url.match(regex); return match ? match[1] : null; }(originalLink);
  const previewUrl = driveId ? `https://drive.google.com/file/d/${driveId}/preview` : null;

  const handleSave = async () => {
      setIsSaving(true);
      try {
          const finalData = { ...editData };
          if (location && !isDownload) {
              finalData["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
              finalData["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}`;
          }
          const cleanTitle = cleanTagName(finalData["Tag"] || finalData["Tag do Painel"] || finalData["Nome"] || item.content);
          await updateDoc(doc(db, groupKey, item.id), { data: finalData, content: cleanTitle });
          setIsEditing(false);
      } catch (e) { alert("ERRO AO SALVAR."); } finally { setIsSaving(false); }
  };

  return (
      <div className="fixed inset-0 z-[300] bg-slate-50 dark:bg-slate-950 overflow-y-auto animate-fadeIn flex flex-col transition-colors">
          <div className={`p-6 sm:p-10 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-20 shadow-lg`}>
              <div className="flex items-center gap-4"><button onClick={onClose} className="p-3 bg-white/20 rounded-xl active:scale-95 transition-all"><ArrowLeft size={24} /></button><div><h2 className="text-xl sm:text-2xl font-black uppercase truncate max-w-[200px]">{isEditing ? "EDITAR" : (cleanTagName(editData["Tag"] || editData["Tag do Painel"] || editData["Nome"] || "DETALHES"))}</h2><span className="text-[9px] font-black uppercase opacity-60 tracking-widest">{config.label}</span></div></div>
              <div className="flex gap-2">
                {!isEditing ? <button onClick={() => setIsEditing(true)} className="px-6 py-3 bg-white/20 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 active:scale-95 transition-all shadow-md"><Edit size={16} /> EDITAR</button> : <button onClick={() => setIsEditing(false)} className="p-3 bg-white/10 rounded-xl active:scale-95 transition-all shadow-lg"><X size={20} /></button>}
              </div>
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col pb-20">
              <div className="p-6 sm:p-12 max-w-6xl mx-auto w-full space-y-8">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden transition-colors">
                      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
                         <div className="flex items-center gap-6">
                            <div className={`p-6 rounded-3xl ${config.lightColor} ${config.textColor} border ${config.borderColor} shadow-sm transition-colors`}><config.icon size={44} /></div>
                            <div>
                               <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{cleanTagName(editData["Tag"] || editData["Tag do Painel"] || editData["Nome"] || "Ficha Industrial")}</h3>
                               <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500" /> Registro Ativo no Inventário</p>
                            </div>
                         </div>
                      </div>
                  </div>

                  {!isDownload ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-lg space-y-6 transition-colors">
                          <div className="flex items-center gap-5">
                            <div className={`p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30 transition-colors`}><MapPin size={28} /></div>
                            <div><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coordenadas GPS</h4><p className="text-base font-mono font-bold text-slate-900 dark:text-white mt-1">{location ? `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}` : "Não Localizado"}</p></div>
                          </div>
                          {location && !isEditing && (
                              <div className="grid grid-cols-2 gap-3 pt-2">
                                  <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`, '_blank')} className="py-4 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"><Navigation size={16} /> Rota GPS</button>
                                  <button onClick={() => window.open(`https://earth.google.com/web/search/${location.lat},${location.lng}`, '_blank')} className="py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-sm border border-slate-200 dark:border-slate-700 transition-all active:scale-95"><Globe size={16} /> Satélite</button>
                              </div>
                          )}
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-lg flex items-center gap-6 transition-colors">
                          <div className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm"><Clock size={28} /></div>
                          <div><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Última Atualização</h4><p className="text-base font-black text-slate-900 dark:text-white uppercase mt-1">{item.createdAt ? (item.createdAt.toDate ? item.createdAt.toDate().toLocaleString('pt-BR') : "Agora") : "Recente"}</p></div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <button onClick={() => window.open(originalLink, '_blank')} className="p-8 bg-cyan-600 hover:bg-cyan-500 text-white rounded-[2rem] flex flex-col items-center justify-center gap-3 font-black uppercase text-xs shadow-xl transition-all active:scale-95 group"><ExternalLink size={28} /> Acessar Drive Cloud</button>
                           <button onClick={() => window.open(`https://drive.google.com/uc?export=download&id=${driveId}`, '_blank')} className="p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-[2rem] flex flex-col items-center justify-center gap-3 font-black uppercase text-xs shadow-lg transition-all active:scale-95 group transition-colors"><FileDown size={28} /> Download Direto</button>
                       </div>
                       {previewUrl && !isEditing && (
                           <div className="w-full aspect-video bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl transition-colors"><iframe src={previewUrl} className="w-full h-full border-none"></iframe></div>
                       )}
                    </div>
                  )}

                  {location && !isEditing && !isDownload && <MiniMapPreview lat={location.lat} lng={location.lng} tag={editData["Tag"] || "Painel"} />}

                  <div className="space-y-6">
                      <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-3"><Database size={16} className="text-blue-600 dark:text-blue-400" /> Parâmetros Técnicos do Ativo</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {Object.entries(editData).map(([key, value]) => isKeyVisible(key) && (
                              <div key={key} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                                <h5 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-3">{key}</h5>
                                {isEditing ? <input type="text" value={String(value)} onChange={(e) => setEditData({ ...editData, [key]: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm outline-none font-bold uppercase focus:border-blue-600 transition-all shadow-inner" /> : <p className="text-slate-900 dark:text-white font-black text-sm uppercase break-words">{String(value)}</p>}
                              </div>
                          ))}
                      </div>
                  </div>
                  {isEditing && (
                      <div className="pt-8 flex justify-center">
                          <button onClick={handleSave} disabled={isSaving} className={`max-w-md w-full py-5 rounded-3xl text-white font-black uppercase text-xs tracking-widest ${config.color} shadow-2xl flex justify-center items-center gap-3 active:scale-95 transition-all`}>{isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />} Confirmar Alterações</button>
                      </div>
                  )}
              </div>
          </div>
      </div>
  );
};

const ItemCard: React.FC<{ item: GroupItem; config: any; onSelect: () => void; searchHighlight: string; }> = ({ item, config, onSelect, searchHighlight }) => {
  const data = item.data || {};
  const isDownload = config.id === 'downloads';
  const tagValue = cleanTagName(data["Tag do Painel"] || data["Tag"] || data["Nome"] || item.content);
  const hasGeo = !!data["Geolocalização"];

  return (
    <div onClick={onSelect} className="relative flex flex-col bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer active:scale-95 group overflow-hidden border-b-4 border-b-transparent hover:border-b-blue-600 dark:hover:border-b-blue-400">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-slate-900 dark:text-white truncate tracking-tighter uppercase group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-1">
            <HighlightedText text={tagValue} highlight={searchHighlight} />
          </h3>
          <div className={`p-2 rounded-xl transition-colors ${hasGeo || isDownload ? (isDownload ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400') : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600'}`}>
              {isDownload ? <FileText size={18} /> : <MapPin size={18} />}
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase truncate transition-colors">
              <HighlightedText text={data["Local Selecionável"] || data["Local"] || data["Categoria"] || "Sem Localização"} highlight={searchHighlight} />
            </div>
            {!isDownload && data["Equipamento"] && (
                <div className="px-3 py-1.5 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/20 rounded-xl text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase truncate transition-colors">
                    <HighlightedText text={data["Equipamento"]} highlight={searchHighlight} />
                </div>
            )}
        </div>

        <div className="flex items-center justify-between text-[8px] font-black text-slate-400 dark:text-slate-600 pt-3 border-t border-slate-100 dark:border-slate-800 uppercase tracking-widest mt-2 transition-colors">
           <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${hasGeo || isDownload ? (isDownload ? 'bg-cyan-500' : 'bg-emerald-500') : 'bg-slate-300 dark:bg-slate-700'}`}></div>{config.label}</div>
           <span>{isDownload ? 'Drive OK' : (hasGeo ? 'Sincronizado' : 'Pendente')}</span>
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({ tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', equipamento: '', customLocal: '', customEquipamento: '', obs: '', desc: '', link: '', nome: '' });
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    const q = query(collection(db, groupKey), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })) as GroupItem[]));
  }, [groupKey]);

  useEffect(() => {
    if (initialSelectedItem) setSelectedItem(initialSelectedItem);
  }, [initialSelectedItem]);

  const handleGetLocation = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGettingLocation(false); },
      () => { setGettingLocation(false); alert('Falha no sensor GPS do dispositivo.'); },
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let data: any = {};
      const finalLocal = formData.local === "NOVO" ? formData.customLocal : formData.local;
      const finalEquip = formData.equipamento === "NOVO" ? formData.customEquipamento : formData.equipamento;
      
      if (groupKey === 'painel') {
          data = { "Tag do Painel": formData.tag, "Tag": formData.tag, "Local Selecionável": finalLocal, "Switch 1": formData.switch1, "Switch 2": formData.switch2, "Switch 3": formData.switch3, "Equipamento": finalEquip, "Observação": formData.obs };
      } else if (groupKey === 'tw_local') {
          data = { "Tag": formData.tag, "Local": finalLocal, "Descrição": formData.desc };
      } else if (groupKey === 'downloads') {
          data = { "Nome": formData.nome, "Categoria": formData.local, "Link": formData.link, "Descrição": formData.desc };
      } else {
          data = { "Tag": formData.tag, "Local": finalLocal, "IP / Ativo": formData.ip };
      }

      if (location && groupKey !== 'downloads') {
          data["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
          data["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}`;
      }
      
      const tagLabel = cleanTagName(formData.tag || formData.nome || "Novo Registro");
      await addDoc(collection(db, groupKey), { content: tagLabel, data, userId: user.uid, userEmail: user.email, createdAt: serverTimestamp() });
      setIsModalOpen(false);
      setFormData({ tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', equipamento: '', customLocal: '', customEquipamento: '', obs: '', desc: '', link: '', nome: '' });
      setLocation(null);
    } catch (e) { alert('Erro de comunicação com o banco de dados.'); } finally { setLoading(false); }
  };

  const filteredItems = items.filter(item => {
    const s = normalizeText(searchTerm.trim());
    if (!s) return true;
    const searchable = [item.content, ...(item.data ? Object.values(item.data) : [])].map(v => normalizeText(String(v))).join(" ");
    return s.split(/\s+/).every(t => searchable.includes(t));
  });

  if (selectedItem) return <ItemDetail item={selectedItem} groupKey={groupKey} config={config} user={user} onClose={() => { setSelectedItem(null); if(initialSelectedItem) onBack(); }} />;

  return (
    <div className="pb-24 animate-fadeIn">
      <div className={`p-8 sm:p-12 mb-10 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 flex flex-col gap-8 shadow-sm relative overflow-hidden transition-colors`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all border border-slate-200 dark:border-slate-700"><ArrowLeft size={28} /></button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                 <div className={`p-2 rounded-lg bg-gradient-to-br ${config.gradient} text-white shadow-md`}><Icon size={16} /></div>
                 <span className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 dark:text-slate-500">{config.label} Central</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{groupKey === 'downloads' ? 'Biblioteca Técnica' : 'Inventário Industrial'}</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
             <ThemeToggle />
             <button onClick={() => setIsModalOpen(true)} className={`flex px-8 py-4 rounded-2xl text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-[10px] tracking-[0.15em] items-center gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all`}>
              <Plus size={18} /> Novo Cadastro
            </button>
          </div>
        </div>
      </div>

      <div className="mb-10 max-w-4xl mx-auto">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" size={24} />
          <input type="text" placeholder={`Pesquisar em ${config.label}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-16 pr-8 py-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] text-slate-900 dark:text-white outline-none font-bold placeholder-slate-400 dark:placeholder-slate-600 shadow-sm focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-600 dark:focus:border-blue-400 transition-all text-lg" />
        </div>
      </div>

      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredItems.map(item => <ItemCard key={item.id} item={item} config={config} onSelect={() => setSelectedItem(item)} searchHighlight={searchTerm} />)}
        </div>
      ) : (
        <div className="py-24 flex flex-col items-center justify-center text-center opacity-40"><FilterX size={80} className="text-slate-300 dark:text-slate-700 mb-6" /><h3 className="text-2xl font-black text-slate-400 dark:text-slate-600 uppercase tracking-tight">Sem Registros Ativos</h3></div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full h-[95vh] sm:h-auto sm:max-w-xl sm:rounded-[3rem] border border-slate-200 dark:border-slate-800 overflow-y-auto shadow-2xl transition-colors">
            <div className={`p-8 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-10 shadow-lg`}><h3 className="text-xl font-black uppercase tracking-tight">Novo Registro Operacional</h3><button onClick={() => setIsModalOpen(false)} className="p-2.5 bg-white/20 rounded-xl"><X size={24} /></button></div>
            <form onSubmit={handleSave} className="p-8 space-y-8">
              {groupKey === 'painel' ? (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Sincronização GPS</label>
                    <button type="button" onClick={handleGetLocation} className="w-full py-5 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/20 rounded-[1.5rem] text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-blue-100 dark:hover:bg-blue-900/20 shadow-sm">
                      {gettingLocation ? <Loader2 className="animate-spin" /> : location ? <CheckCircle className="text-emerald-500" /> : <Crosshair />}
                      {location ? "GPS Sincronizado" : "Capturar Coordenadas Atuais"}
                    </button>
                    {location && <MiniMapPreview lat={location.lat} lng={location.lng} tag={formData.tag} />}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Tag Identificadora do Painel</label>
                    <input type="text" placeholder="Ex: VC-1080KS-13.06" required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl text-base font-bold outline-none focus:border-blue-600 dark:focus:border-blue-400 transition-all uppercase shadow-inner" />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Switch 1 (IP)</label>
                      <input type="text" placeholder="10.x.x.x" value={formData.switch1} onChange={e => setFormData({...formData, switch1: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-[10px] font-bold outline-none focus:border-blue-600 uppercase" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Switch 2 (IP)</label>
                      <input type="text" placeholder="10.x.x.x" value={formData.switch2} onChange={e => setFormData({...formData, switch2: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-[10px] font-bold outline-none focus:border-blue-600 uppercase" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Switch 3 (IP)</label>
                      <input type="text" placeholder="10.x.x.x" value={formData.switch3} onChange={e => setFormData({...formData, switch3: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-[10px] font-bold outline-none focus:border-blue-600 uppercase" />
                    </div>
                  </div>

                  <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Sistema Industrial</label>
                      <select required value={formData.local} onChange={e => setFormData({...formData, local: e.target.value, equipamento: ''})} className="w-full px-6 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-black uppercase outline-none focus:border-blue-600 appearance-none shadow-sm cursor-pointer">
                        <option value="">Selecione Local...</option>
                        {Object.keys(SYSTEM_DATA).map(loc => <option key={loc} value={loc}>{loc}</option>)}
                        <option value="NOVO">+ NOVO SISTEMA TÉCNICO</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Equipamento Vinculado</label>
                      <select required disabled={!formData.local} value={formData.equipamento} onChange={e => setFormData({...formData, equipamento: e.target.value})} className="w-full px-6 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-black uppercase outline-none focus:border-blue-600 appearance-none shadow-sm cursor-pointer disabled:opacity-30">
                        <option value="">Selecione Ativo...</option>
                        {formData.local && formData.local !== "NOVO" && (SYSTEM_DATA[formData.local] || []).map(eq => (
                          <option key={eq} value={eq}>{eq}</option>
                        ))}
                        <option value="NOVO">+ NOVO ATIVO INDUSTRIAL</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : groupKey === 'downloads' ? (
                <div className="space-y-5">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 ml-1 uppercase">Título / Referência</label>
                      <input type="text" placeholder="Manual Técnico Rev.A" required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold outline-none shadow-inner" />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 ml-1 uppercase">Link Drive</label>
                      <input type="url" placeholder="https://drive.google.com/..." required value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm outline-none shadow-inner" />
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 ml-1 uppercase">Tag Industrial</label>
                      <input type="text" placeholder="TAG-XXX" required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-black uppercase outline-none focus:border-blue-600 shadow-inner" />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 ml-1 uppercase">Localização Geográfica</label>
                      <input type="text" placeholder="Geral" value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold uppercase outline-none shadow-inner" />
                  </div>
                  <button type="button" onClick={handleGetLocation} className="w-full py-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/20 rounded-2xl text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3">
                    {gettingLocation ? <Loader2 className="animate-spin" /> : location ? <CheckCircle className="text-emerald-500" /> : <Crosshair />} Sincronizar GPS
                  </button>
                </div>
              )}
              <button type="submit" disabled={loading} className={`w-full py-6 rounded-3xl text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all active:scale-95 ring-1 ring-white/10`}>
                 {loading ? <Loader2 className="animate-spin" /> : "Validar e Gravar Cadastro"}
              </button>
            </form>
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
  const [loadingMap, setLoadingMap] = useState(false);
  const [itemFromSearch, setItemFromSearch] = useState<GroupItem | null>(null);

  useEffect(() => {
    const colls = ['ctv', 'telecom', 'embarcados', 'painel', 'tw_local', 'downloads'];
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

  if (currentView !== 'home') return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 sm:p-14 transition-colors"><div className="max-w-7xl mx-auto"><GroupPage groupKey={currentView} user={user} onBack={() => { setCurrentView('home'); setItemFromSearch(null); }} initialSelectedItem={itemFromSearch} /></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 sm:p-20 text-slate-900 dark:text-white relative overflow-hidden flex flex-col transition-colors duration-300">
      <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-blue-50 dark:bg-blue-900/5 blur-[150px] rounded-full pointer-events-none transition-colors"></div>
      
      {isMapModalOpen && <GlobalMapModal items={allData} onClose={() => setIsMapModalOpen(false)} onSelectItem={(item) => { setItemFromSearch(item); setCurrentView(item.groupType as GroupType); setIsMapModalOpen(false); }} />}
      
      <div className="max-w-7xl mx-auto w-full space-y-16 animate-fadeIn relative z-10 flex-1">
        <header className="flex flex-col gap-12">
          <div className="flex justify-between items-center">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 shadow-sm transition-colors"><IdCard size={18} /> TAGFINDER Enterprise System</div>
            <div className="flex gap-3">
              <ThemeToggle />
              <button onClick={() => signOut(auth)} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-red-500 transition-all shadow-sm active:scale-95"><LogOut size={24} /></button>
            </div>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12">
            <div><h1 className="text-4xl sm:text-7xl font-black tracking-tight leading-none text-slate-900 dark:text-white transition-colors">Olá, <span className="text-blue-600 dark:text-blue-400">{user.email?.split('@')[0]}</span></h1><p className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-[0.3em] mt-6 border-l-4 border-blue-600 dark:border-blue-500 pl-6">Inventário Técnico Operacional • Monitoramento em Tempo Real</p></div>
            <button onClick={() => setIsMapModalOpen(true)} className="group relative overflow-hidden flex items-center gap-8 bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl transition-all hover:border-blue-300 dark:hover:border-blue-700 text-left active:scale-95"><div className="p-5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-3xl group-hover:scale-110 transition-transform shadow-sm relative z-10 transition-colors"><Globe size={40} /></div><div className="relative z-10"><h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none transition-colors">Mapa Global</h3><p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase mt-2 tracking-widest">Ativos Sincronizados</p></div></button>
          </div>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 sm:gap-8 pb-20">
          {Object.entries(groupsConfig).map(([key, group]) => (
             <button key={key} onClick={() => setCurrentView(key as GroupType)} className="relative overflow-hidden group bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 flex flex-col items-start transition-all active:scale-95 shadow-lg hover:shadow-2xl hover:border-blue-100 dark:hover:border-blue-900/50">
               <div className={`w-16 h-16 rounded-[1.5rem] ${group.lightColor} ${group.textColor} border ${group.borderColor} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-sm transition-colors`}><group.icon size={36} /></div>
               <h2 className="text-lg font-black mb-4 tracking-tighter uppercase leading-tight text-slate-900 dark:text-white transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">{group.label}</h2>
               <div className={`inline-flex items-center gap-2 font-black text-[9px] uppercase tracking-widest ${group.textColor} opacity-60 group-hover:opacity-100 transition-opacity`}>Acessar <ArrowRight size={14} /></div>
             </button>
          ))}
        </section>
      </div>
      <footer className="py-16 text-center border-t border-slate-100 dark:border-slate-900 mt-auto transition-colors"><p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.4em]">TagFinder Enterprise • 2024 • Industrial Automation & Logic</p></footer>
    </div>
  );
};

export default Dashboard;