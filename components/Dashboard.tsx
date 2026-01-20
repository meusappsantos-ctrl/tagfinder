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

const getDriveFileId = (url: string) => {
  if (!url) return null;
  const regex = /[-\w]{25,}/;
  const match = url.match(regex);
  return match ? match[0] : null;
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
  const isDownload = config.id === 'downloads';
  const isTW = config.id === 'tw_local';
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
            <button onClick={(e) => { e.stopPropagation(); if(confirm("Deseja excluir?")) onDelete(item.id); }} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16} /></button>
            <div className={`p-2 rounded-lg ${hasGeo || isDownload ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>{isDownload ? <FileText size={14} /> : <MapPin size={14} />}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 bg-slate-900/30 px-3 py-1.5 rounded-lg border border-white/5">
          <span className="text-[9px] font-black uppercase"><HighlightedText text={data["Local"] || data["Categoria"] || "S/ LOCAL"} highlight={searchHighlight} /></span>
        </div>

        {isPainel && (
          <div className="space-y-2 mt-1 animate-fadeIn">
            {data["Equipamento"] && (
              <div className="px-2 py-1 bg-orange-500/10 border border-orange-500/20 rounded text-[8px] text-orange-400 font-black uppercase tracking-tighter truncate flex items-center gap-1.5 shadow-sm">
                <Cpu size={10} />
                <HighlightedText text={data["Equipamento"]} highlight={searchHighlight} />
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {['Switch1', 'Switch2', 'Switch3'].map(swKey => data[swKey] && (
                <div key={swKey} className="flex items-center gap-1.5 px-2 py-1 bg-slate-700/40 rounded-lg text-[7px] text-slate-300 font-black border border-white/5 shadow-inner">
                  <Signal size={9} className="text-blue-400" />
                  <span className="opacity-50 uppercase tracking-tighter">{swKey.replace('Switch', 'SW')}:</span>
                  <HighlightedText text={data[swKey]} highlight={searchHighlight} />
                </div>
              ))}
            </div>
          </div>
        )}

        {!isPainel && !isDownload && !isTW && data["IP / Equipamento"] && (
           <div className="px-3 py-2 bg-blue-500/5 border border-blue-500/10 rounded-xl text-[9px] text-blue-300 font-mono flex items-center gap-2">
              <Database size={12} className="text-blue-500" />
              <span className="truncate tracking-widest uppercase"><HighlightedText text={data["IP / Equipamento"]} highlight={searchHighlight} /></span>
           </div>
        )}

        <div className="flex items-center justify-between text-[8px] font-black text-slate-500 pt-2 border-t border-white/5 uppercase mt-auto tracking-widest">
           <div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${hasGeo || isDownload ? (isDownload ? 'bg-cyan-500' : 'bg-emerald-500 animate-pulse') : 'bg-slate-600'}`}></div>{config.label}</div>
           <span>{isDownload ? 'NUVEM OK' : (hasGeo ? 'GPS OK' : 'SEM GPS')}</span>
        </div>
      </div>
    </div>
  );
};

const ItemDetail: React.FC<{ item: GroupItem; groupKey: string; config: any; user: User; onClose: () => void; onDelete: (id: string) => void; }> = ({ item, groupKey, config, user, onClose, onDelete }) => {
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
  const originalLink = editData["Link"] || item.data?.["Link"] || "";
  const driveId = getDriveFileId(originalLink);
  
  const previewUrl = driveId ? `https://drive.google.com/file/d/${driveId}/preview` : null;
  const directDownloadUrl = driveId ? `https://drive.google.com/uc?export=download&id=${driveId}` : originalLink;

  const handleSave = async () => {
      setIsSaving(true);
      try {
          const finalData = { ...editData };
          if (location && !isDownload) {
              finalData["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
              finalData["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}`;
          }
          await updateDoc(doc(db, groupKey, item.id), { data: finalData, content: (finalData["Tag"] || finalData["Nome"]) ? `Item: ${finalData["Tag"] || finalData["Nome"]}` : item.content });
          setIsEditing(false);
      } catch (e) { alert("ERRO AO SALVAR."); } finally { setIsSaving(false); }
  };

  return (
      <div className="fixed inset-0 z-[300] bg-slate-900 overflow-y-auto animate-fadeIn flex flex-col">
          <div className={`p-6 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-20 shadow-xl`}>
              <div className="flex items-center gap-4">
                <button onClick={onClose} className="p-2 bg-white/20 rounded-xl active:scale-95 transition-all shadow-lg"><ArrowLeft size={24} /></button>
                <div><h2 className="font-black uppercase truncate max-w-[200px] leading-tight">{isEditing ? "EDITAR" : (editData["Tag"] || editData["Nome"] || "DETALHES")}</h2><span className="text-[9px] opacity-60 tracking-widest uppercase font-black">{config.label}</span></div>
              </div>
              <div className="flex gap-2">
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="px-5 py-2.5 bg-white/20 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 active:scale-95 transition-all shadow-lg"><Edit size={16} /> EDITAR</button>
                ) : <button onClick={() => setIsEditing(false)} className="p-3 bg-white/10 rounded-xl shadow-lg active:scale-90"><X size={20} /></button>}
              </div>
          </div>
          
          <div className="flex-1 p-6 sm:p-10 space-y-10 max-w-5xl mx-auto w-full pb-20">
             {isDownload && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <button onClick={() => window.open(originalLink, '_blank')} className="p-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-3xl flex flex-col items-center justify-center gap-2 font-black uppercase text-xs shadow-2xl transition-all active:scale-95 group">
                          <ExternalLink size={24} className="group-hover:scale-110 transition-transform" /> ABRIR NO DRIVE
                       </button>
                       <button onClick={() => window.open(directDownloadUrl, '_blank')} className="p-6 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-3xl flex flex-col items-center justify-center gap-2 font-black uppercase text-xs shadow-2xl transition-all active:scale-95 group">
                          <FileDown size={24} className="group-hover:translate-y-1 transition-transform" /> DOWNLOAD DIRETO
                       </button>
                    </div>
                    {previewUrl && !isEditing ? (
                       <div className="space-y-4">
                          <div className="flex items-center justify-between px-2">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Eye size={14} className="text-cyan-500" /> Pré-visualização</h4>
                          </div>
                          <div className="w-full aspect-[4/3] sm:aspect-video bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl ring-1 ring-white/5">
                             <iframe src={previewUrl} className="w-full h-full border-none" allow="autoplay; encrypted-media"></iframe>
                          </div>
                       </div>
                    ) : !isEditing && (
                      <div className="p-10 text-center bg-slate-800/40 rounded-3xl border border-dashed border-slate-700 opacity-50">
                        <FileText size={48} className="mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase">Visualização Indisponível</p>
                      </div>
                    )}
                </div>
             )}

             {!isDownload && location && (
               <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl space-y-4 ring-1 ring-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Localização Técnica</h4>
                      <p className="text-sm font-mono text-emerald-400 font-black tracking-tighter">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`, '_blank')} className="p-3 bg-emerald-600 text-white rounded-xl active:scale-90 transition-all shadow-lg"><Navigation size={20}/></button>
                       <button onClick={() => window.open(`https://maps.google.com/?q=${location.lat},${location.lng}`, '_blank')} className="p-3 bg-blue-600 text-white rounded-xl active:scale-90 transition-all shadow-lg"><MapPin size={20}/></button>
                    </div>
                  </div>
                  <MiniMapPreview lat={location.lat} lng={location.lng} tag={editData["Tag"]} />
               </div>
             )}

             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(editData).map(([k, v]) => isKeyVisible(k) && (
                  <div key={k} className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/60 shadow-lg group hover:border-slate-500/50 transition-all">
                    <h5 className="text-[9px] font-black text-slate-600 uppercase mb-3 opacity-70 tracking-widest">{k}</h5>
                    {isEditing ? (
                        <input type="text" value={String(v)} onChange={(e) => setEditData({ ...editData, [k]: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none font-bold uppercase focus:border-blue-500 transition-all shadow-inner" />
                    ) : (
                        <p className="text-white font-black text-sm uppercase break-all leading-tight">{String(v)}</p>
                    )}
                  </div>
                ))}
             </div>

             {isEditing && (
                <div className="grid grid-cols-2 gap-4 pt-10 pb-10">
                    <button onClick={() => { if(confirm("Excluir?")) { onDelete(item.id); onClose(); } }} className="py-5 rounded-2xl bg-red-600/10 text-red-500 border border-red-500/20 font-black uppercase text-[10px] active:scale-95 transition-all shadow-lg">EXCLUIR REGISTRO</button>
                    <button onClick={handleSave} disabled={isSaving} className={`py-5 rounded-2xl text-white font-black uppercase text-[10px] ${config.color} shadow-2xl flex justify-center items-center gap-3 active:scale-95 transition-all`}>
                      {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16} />} SALVAR ALTERAÇÕES
                    </button>
                </div>
             )}
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
  const [formData, setFormData] = useState<any>({ tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', equipamento: '', obs: '', desc: '', link: '', nome: '' });
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

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
      } else if (groupKey === 'tw_local') {
          data = { "Tag": formData.tag, "Local": formData.local, "Descrição": formData.desc };
      } else {
          // CTV, Telecom, Embarcados
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

  if (selectedItem) return <ItemDetail item={selectedItem} groupKey={groupKey} config={config} user={user} onClose={() => setSelectedItem(null)} onDelete={handleDeleteItem} />;

  return (
    <div className="pb-24 animate-fadeIn">
      <div className="p-6 sm:p-10 mb-8 bg-slate-800/60 rounded-[2.5rem] border border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-2xl ring-1 ring-white/5">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-700 rounded-xl text-slate-300 hover:bg-slate-600 transition-all active:scale-95 shadow-lg"><ArrowLeft size={24} /></button>
          <div><span className="text-[9px] uppercase font-black text-slate-500 tracking-widest">{config.label}</span><h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter uppercase leading-none">{groupKey === 'downloads' ? 'Arquivos Técnicos' : 'Inventário de Ativos'}</h2></div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className={`px-6 py-3 rounded-xl text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all`}>
          <Plus size={16} /> Novo Registro
        </button>
      </div>

      <div className="relative mb-8 max-w-4xl mx-auto px-4 sm:px-0">
        <Search className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input type="text" placeholder={`Buscar em ${config.label}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-3xl text-white outline-none font-bold placeholder-slate-600 shadow-2xl focus:border-blue-500/50 transition-all shadow-inner" />
      </div>

      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 px-4 sm:px-0">
          {filteredItems.map(item => <ItemCard key={item.id} item={item} config={config} onDelete={handleDeleteItem} onSelect={() => setSelectedItem(item)} searchHighlight={searchTerm} />)}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-center opacity-50"><FilterX size={64} className="mb-4 text-slate-700" /><h3 className="font-black uppercase tracking-tight text-white">Nenhum item encontrado</h3></div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md overflow-hidden">
          <div className="bg-slate-800 w-full max-w-lg h-[95vh] sm:h-auto sm:max-h-[90vh] sm:rounded-[2.5rem] border-t sm:border border-slate-600 overflow-y-auto shadow-2xl animate-slideUp ring-1 ring-white/10">
            <div className={`p-6 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-10 shadow-xl`}>
              <h3 className="font-black uppercase tracking-widest">Cadastrar {config.label}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white/10 rounded-lg active:scale-90 transition-all shadow-lg"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6">
              
              {groupKey !== 'downloads' && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2 tracking-widest"><MapPin size={12} /> Sincronização GPS</label>
                  <button type="button" onClick={handleGetLocation} className="w-full py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-[9px] font-black uppercase text-blue-400 flex items-center justify-center gap-3 active:scale-95 transition-all shadow-inner">
                    {gettingLocation ? <Loader2 className="animate-spin" size={16}/> : location ? <CheckCircle className="text-emerald-500" size={16}/> : <Crosshair size={16}/>}
                    {location ? "GPS ATUALIZADO" : "ATIVAR CAPTURA GPS"}
                  </button>
                  {location && <MiniMapPreview lat={location.lat} lng={location.lng} tag={formData.tag} />}
                </div>
              )}

              {groupKey === 'painel' ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Tag do Painel</label>
                    <input type="text" placeholder="Ex: vc-1080ks" required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-base font-black outline-none focus:border-blue-500 transition-all uppercase shadow-inner" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {['1', '2', '3'].map(n => (
                      <div key={n} className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Switch {n}</label>
                        <input type="text" placeholder="IP/TAG" value={formData[`switch${n}`]} onChange={e => setFormData({...formData, [`switch${n}`]: e.target.value})} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-[10px] font-black outline-none focus:border-blue-500 shadow-inner uppercase" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Local / Sistema</label>
                    <select value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-xs font-black uppercase outline-none focus:border-blue-500 cursor-pointer shadow-inner">
                      <option value="">Selecione Local...</option>
                      {Object.keys(SYSTEM_DATA).map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Ativo Vinculado</label>
                    <input type="text" placeholder="Ex: vc-1080" value={formData.equipamento} onChange={e => setFormData({...formData, equipamento: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-xs font-black outline-none focus:border-blue-500 shadow-inner uppercase" />
                  </div>
                </div>
              ) : groupKey === 'downloads' ? (
                <div className="space-y-5">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 ml-1 uppercase tracking-widest">Título do Arquivo</label>
                      <input type="text" placeholder="Manual Técnico" required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white outline-none font-black uppercase shadow-inner" />
                  </div>
                  <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 ml-1 uppercase tracking-widest">Link Google Drive</label>
                      <input type="url" placeholder="https://drive.google.com/..." required value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white outline-none font-mono text-[10px] shadow-inner" />
                  </div>
                  <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 ml-1 uppercase tracking-widest">Categoria</label>
                      <input type="text" placeholder="Ex: Manuais" value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white outline-none font-black uppercase shadow-inner" />
                  </div>
                </div>
              ) : groupKey === 'tw_local' ? (
                <div className="space-y-5">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 ml-1 uppercase tracking-widest">Tag / Marco TW</label>
                      <input type="text" placeholder="Ex: TW-001" required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white outline-none font-black uppercase shadow-inner" />
                  </div>
                  <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 ml-1 uppercase tracking-widest">Área / Sistema</label>
                      <input type="text" placeholder="Britagem" value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white outline-none font-black uppercase shadow-inner" />
                  </div>
                  <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 ml-1 uppercase tracking-widest">Informações Adicionais</label>
                      <textarea placeholder="Localização física..." value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white outline-none font-bold text-xs shadow-inner min-h-[80px]" />
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 ml-1 uppercase tracking-widest">Tag do Equipamento</label>
                      <input type="text" placeholder="TAG-1080" required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white outline-none font-black uppercase shadow-inner" />
                  </div>
                  <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 ml-1 uppercase tracking-widest">IP / Endereço Técnico</label>
                      <input type="text" placeholder="10.10.x.x" value={formData.ip} onChange={e => setFormData({...formData, ip: e.target.value})} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white outline-none font-mono text-xs uppercase shadow-inner" />
                  </div>
                  <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 ml-1 uppercase tracking-widest">Localização Geográfica</label>
                      <input type="text" placeholder="Sistema 01" value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white outline-none font-black uppercase shadow-inner" />
                  </div>
                </div>
              )}
              
              <button type="submit" disabled={loading} className={`w-full py-5 rounded-2xl text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-[10px] tracking-widest shadow-2xl transition-all active:scale-95 ring-1 ring-white/10`}>
                 {loading ? <Loader2 className="animate-spin" size={20}/> : "FINALIZAR CADASTRO"}
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
    <div className="min-h-screen bg-slate-900 p-6 sm:p-14 text-white flex flex-col relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none"></div>
      
      {isMapModalOpen && <GlobalMapModal items={allData} onClose={() => setIsMapModalOpen(false)} onSelectItem={() => {}} />}
      
      <div className="max-w-6xl mx-auto w-full space-y-12 flex-1 relative z-10 animate-fadeIn">
        <header className="flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black uppercase leading-tight tracking-tighter">Olá, <span className="text-blue-500">{user.email?.split('@')[0]}</span></h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1 opacity-70">SISTEMA TAGFINDER &bull; V1.5</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setIsMapModalOpen(true)} className="p-4 bg-blue-600/10 text-blue-400 rounded-2xl border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all shadow-2xl active:scale-95"><Globe size={22} /></button>
            <button onClick={() => signOut(auth)} className="p-4 bg-slate-800 rounded-2xl text-slate-500 hover:text-red-500 transition-all shadow-xl active:scale-95"><LogOut size={22} /></button>
          </div>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
          {Object.entries(groupsConfig).map(([key, group]) => (
             <button key={key} onClick={() => setCurrentView(key as GroupType)} className="bg-slate-900/60 p-6 rounded-[2rem] border border-slate-800/80 flex flex-col items-start transition-all hover:bg-slate-800 hover:scale-105 active:scale-95 shadow-2xl group relative overflow-hidden ring-1 ring-white/5">
               <div className="absolute top-0 right-0 p-12 bg-white/5 blur-3xl -mr-10 -mt-10 group-hover:bg-white/10 transition-all"></div>
               <div className={`w-12 h-12 rounded-2xl ${group.lightColor} ${group.textColor} flex items-center justify-center mb-6 ring-4 ring-white/5 relative z-10 shadow-lg`}><group.icon size={28} /></div>
               <h2 className="text-xs sm:text-lg font-black tracking-tighter uppercase leading-tight relative z-10 group-hover:text-blue-400 transition-colors">{group.label}</h2>
               <div className={`flex items-center gap-2 font-black text-[7px] ${group.textColor} opacity-60 mt-2 uppercase tracking-widest relative z-10`}>Acessar <ArrowRight size={12} /></div>
             </button>
          ))}
        </section>
      </div>

      <footer className="py-12 text-center opacity-40 mt-auto"><p className="text-[9px] font-black uppercase tracking-widest">TagFinder Enterprise &bull; 2024</p></footer>
    </div>
  );
};

export default Dashboard;