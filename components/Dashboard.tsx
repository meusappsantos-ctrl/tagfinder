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
} = firestore as any;

import { auth, db } from '../services/firebase';
import { 
  LogOut, Tv, Radio, Cpu, ArrowLeft, ArrowRight, Search, Plus, Save, 
  MapPin, Loader2, Edit, X, Globe, Trash2, Crosshair, Server, 
  CheckCircle, Database, Activity, Locate, 
  Link, FileText, Download, Eye, 
  MessageSquare, Navigation, FileDown
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
  createdAt: any | null;
  groupType?: GroupType;
}

type GroupType = 'ctv' | 'telecom' | 'embarcados' | 'painel' | 'tw_local' | 'downloads';
type ViewState = 'home' | GroupType;

const GOOGLE_HYBRID_URL = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';

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
  ctv: { id: 'ctv', label: 'CFTV', icon: Tv, color: 'bg-blue-600', textColor: 'text-blue-400', lightColor: 'bg-blue-900/30', borderColor: 'border-blue-800/50', gradient: 'from-blue-600 to-blue-800' },
  telecom: { id: 'telecom', label: 'Telecom', icon: Radio, color: 'bg-indigo-600', textColor: 'text-indigo-400', lightColor: 'bg-indigo-900/30', borderColor: 'border-indigo-800/50', gradient: 'from-indigo-600 to-indigo-800' },
  painel: { id: 'painel', label: 'Painéis', icon: Server, color: 'bg-orange-600', textColor: 'text-orange-400', lightColor: 'bg-orange-900/30', borderColor: 'border-orange-800/50', gradient: 'from-orange-600 to-orange-800' },
  embarcados: { id: 'embarcados', label: 'Embarcados', icon: Cpu, color: 'bg-emerald-600', textColor: 'text-emerald-400', lightColor: 'bg-emerald-900/30', borderColor: 'border-emerald-800/50', gradient: 'from-emerald-600 to-emerald-800' },
  tw_local: { id: 'tw_local', label: 'Local TW', icon: Locate, color: 'bg-purple-600', textColor: 'text-purple-400', lightColor: 'bg-purple-900/30', borderColor: 'border-purple-800/50', gradient: 'from-purple-600 to-purple-800' },
  downloads: { id: 'downloads', label: 'Downloads', icon: Download, color: 'bg-cyan-600', textColor: 'text-cyan-400', lightColor: 'bg-cyan-900/30', borderColor: 'border-cyan-800/50', gradient: 'from-cyan-600 to-cyan-800' },
};

const normalizeText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const cleanTagName = (tag: string) => (tag || "").replace(/^(Item|Tag|Ativo|ITEM|TW):\s*/gi, '').split('|')[0].trim();

const getDrivePreviewUrl = (url: string) => {
  if (!url) return null;
  const match = url.match(/(?:\/d\/|id=)([\w-]+)/);
  return match ? `https://drive.google.com/file/d/${match[1]}/preview` : null;
};

const HighlightedText: React.FC<{ text: string; highlight: string; className?: string }> = ({ text, highlight, className = "" }) => {
  if (!highlight.trim()) return <span className={className}>{text}</span>;
  const terms = highlight.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  const pattern = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);
  return (
    <span className={className}>
      {parts.map((part, i) => regex.test(part) ? (
        <mark key={i} className="bg-blue-600 text-white rounded-none px-0.5 font-bold">{part}</mark>
      ) : part)}
    </span>
  );
};

const GlobalMapModal: React.FC<{ items: GroupItem[], onClose: () => void, onSelectItem: (item: GroupItem) => void }> = ({ items, onClose, onSelectItem }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;
    const map = L.map(mapRef.current, { zoomControl: false, maxZoom: 22 }).setView([-15.78, -47.92], 4);
    L.tileLayer(GOOGLE_HYBRID_URL, { maxZoom: 22, maxNativeZoom: 20, detectRetina: true }).addTo(map);
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
          marker.bindTooltip(cleanTagName(item.data?.["Tag"] || item.data?.["Nome"] || "Item"), { permanent: true, direction: 'top', className: 'tag-label', offset: [0, -8] });
          layerGroupRef.current.addLayer(marker);
          bounds.extend([lat, lng]);
          hasGeo = true;
        }
      }
    });
    if (hasGeo) mapInstance.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 18 });
  }, [items]);

  return (
    <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md">
      <div className="bg-slate-900 w-full h-[100vh] sm:h-[90vh] sm:max-w-6xl overflow-hidden flex flex-col border border-slate-700 shadow-2xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 backdrop-blur-xl relative z-20">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20"><Globe size={20} /></div>
             <div><h3 className="font-black text-white text-base tracking-tighter uppercase leading-none">Mapa Geral Satélite</h3><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Google Earth Engine</p></div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 transition-all border border-slate-700 text-slate-400"><X size={24} /></button>
        </div>
        <div className="flex-1 relative bg-black"><div ref={mapRef} className="absolute inset-0 z-0" /></div>
      </div>
    </div>
  );
};

const MiniMapPreview: React.FC<{ lat: number, lng: number, tag: string }> = ({ lat, lng, tag }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, touchZoom: false }).setView([lat, lng], 18);
    L.tileLayer(GOOGLE_HYBRID_URL, { maxZoom: 22, maxNativeZoom: 20, detectRetina: true }).addTo(map);
    L.circleMarker([lat, lng], { radius: 6, fillColor: '#3b82f6', color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 1 }).addTo(map);
    mapInstance.current = map;
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [lat, lng, tag]);

  return <div ref={mapRef} className="w-full h-40 border border-slate-700 shadow-inner overflow-hidden mt-2 grayscale hover:grayscale-0 transition-all" />;
};

const ItemCard: React.FC<{ item: GroupItem; config: any; onSelect: () => void; onDelete: (id: string) => void; searchHighlight: string; }> = ({ item, config, onSelect, onDelete, searchHighlight }) => {
  const data = item.data || {};
  const isPainel = config.id === 'painel';
  const isDownload = config.id === 'downloads';
  const tagValue = cleanTagName(data["Tag"] || data["Tag do Painel"] || data["Nome"] || item.content);
  const hasGeo = (isPainel || config.id === 'tw_local') && !!data["Geolocalização"];

  return (
    <div onClick={onSelect} className="group relative flex flex-col bg-slate-800/50 border border-slate-700 p-0 shadow-lg hover:bg-slate-800 hover:border-blue-500/50 transition-all cursor-pointer active:translate-x-1 active:translate-y-1 overflow-hidden">
      <div className={`h-1 w-full ${config.color}`}></div>
      <div className="p-4 sm:p-5 flex flex-col gap-3 min-h-[160px]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-slate-500 tracking-widest mb-0.5 uppercase">{config.label}</p>
            <h3 className="text-sm sm:text-base font-black text-white truncate tracking-tighter group-hover:text-blue-400 transition-colors uppercase">
              <HighlightedText text={tagValue} highlight={searchHighlight} />
            </h3>
          </div>
          <div className="flex items-center gap-1">
             {isPainel && (
                <button 
                  onClick={(e) => { e.stopPropagation(); if(confirm("Deseja excluir este registro?")) onDelete(item.id); }} 
                  className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 size={16} />
                </button>
             )}
             {isDownload ? <div className="p-1.5 bg-slate-900 border border-cyan-500/30 text-cyan-400"><Download size={14} /></div> : null}
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-1.5">
          <div className="flex items-center gap-2 text-slate-400 bg-slate-900/50 px-2.5 py-1.5 border-l-2 border-slate-700">
             {isDownload ? <Database size={10} className="text-cyan-500" /> : <Locate size={10} />}
             <span className="text-[9px] font-bold truncate tracking-tight uppercase">
                <HighlightedText text={data["Local Selecionável"] || data["Local"] || data["Categoria"] || "N/A"} highlight={searchHighlight} />
             </span>
          </div>
          
          {isPainel && (
            <div className="flex flex-wrap gap-1.5 mt-1">
               {["Switch 1", "Switch 2", "Switch 3"].map(key => {
                 const val = data[key];
                 if (!val) return null;
                 return (
                   <div key={key} className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                      <Activity size={8} className="text-orange-500" /> {key.replace('Switch ', 'SW')}: {val}
                   </div>
                 );
               })}
            </div>
          )}

          {isDownload && data["Link"] && (
            <div className="mt-1 space-y-1.5">
               <div className="flex items-center gap-2 text-[8px] text-slate-500 border-l-2 border-slate-800 px-2">
                  <Link size={10} className="text-cyan-500" /> <span className="font-mono truncate max-w-[120px]">{data["Link"]}</span>
               </div>
               {data["Descrição"] && <p className="text-[8px] text-slate-600 px-2 italic line-clamp-2 uppercase">{data["Descrição"]}</p>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-[8px] font-black text-slate-500 pt-2 border-t border-slate-700/50 tracking-widest uppercase mt-auto">
           <span className="flex items-center gap-1.5">
             <div className={`w-1.5 h-1.5 ${hasGeo || isDownload ? (isDownload ? 'bg-cyan-500' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]') : 'bg-slate-700'}`}></div>
             {isDownload ? 'VISUALIZAR' : (hasGeo ? 'SINCRONIZADO' : config.label)}
           </span>
           <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-all" />
        </div>
      </div>
    </div>
  );
};

const ItemDetail: React.FC<{ item: GroupItem; groupKey: string; config: any; user: User; onClose: () => void; onDelete: (id: string) => void; }> = ({ item, groupKey, config, user, onClose, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>(item.data || {});
  
  const isDownload = groupKey === 'downloads';
  const isPainel = groupKey === 'painel';
  const previewUrl = isDownload ? getDrivePreviewUrl(editData["Link"]) : null;

  const handleSave = async () => {
      setIsSaving(true);
      try {
          await updateDoc(doc(db, groupKey, item.id), { data: editData, content: cleanTagName(editData["Tag"] || editData["Nome"] || item.content) });
          setIsEditing(false);
      } catch (e) { alert("Erro ao salvar"); } finally { setIsSaving(false); }
  };

  return (
      <div className="fixed inset-0 z-[300] bg-slate-900 overflow-y-auto flex flex-col animate-fadeIn">
          <div className="p-4 sm:p-6 bg-slate-800 border-b border-slate-700 text-white flex justify-between items-center sticky top-0 z-20 shadow-xl">
              <div className="flex items-center gap-4 min-w-0">
                <button onClick={onClose} className="p-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600"><ArrowLeft size={20} /></button>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-black truncate uppercase tracking-tighter">{cleanTagName(editData["Tag"] || editData["Nome"] || "Ficha Técnica")}</h2>
                  <p className="text-[9px] font-black text-slate-500 tracking-widest uppercase mt-1">{config.label} &bull; Registro de Ativo</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(!isEditing)} className="p-2.5 bg-slate-700 border border-slate-600">{isEditing ? <X size={18} /> : <Edit size={18} />}</button>
                {isEditing && <button onClick={handleSave} disabled={isSaving} className="p-2.5 bg-blue-600">{isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}</button>}
              </div>
          </div>
          
          <div className="flex-1 bg-slate-950 p-4 sm:p-12 space-y-8">
              {isDownload && previewUrl && !isEditing ? (
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Eye size={14} className="text-cyan-400" /> Visualização do Documento</h4>
                       <button onClick={() => window.open(editData["Link"], '_blank')} className="text-[9px] font-black text-cyan-400 hover:underline uppercase">Abrir tela cheia</button>
                    </div>
                    <div className="w-full aspect-[4/3] sm:aspect-video bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
                       <iframe src={previewUrl} className="w-full h-full border-none" allow="autoplay"></iframe>
                    </div>
                 </div>
              ) : null}

              <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <Database className="text-blue-500" size={20} />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Informações de Inventário</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(editData).map(([key, value]) => {
                      if (key === "Geolocalização" || key === "Link Maps") return null;
                      return (
                        <div key={key} className="space-y-2">
                          <h5 className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{key}</h5>
                          {isEditing ? (
                            <input type="text" value={String(value)} onChange={(e) => setEditData({ ...editData, [key]: e.target.value })} className="w-full bg-slate-950 border border-slate-700 px-3 py-2 text-white font-bold text-sm outline-none focus:border-blue-500 transition-all uppercase shadow-inner" />
                          ) : (
                            <p className="text-white font-black text-sm p-3 bg-slate-800/50 border border-slate-800 uppercase break-words">{String(value)}</p>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              {editData["Geolocalização"] && (
                <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8">
                   <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${editData["Geolocalização"]}`, '_blank')} className="w-full py-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl">
                      <Navigation size={18} /> Iniciar Rota GPS
                   </button>
                </div>
              )}

              {isPainel && (
                <button onClick={async () => { if(confirm("EXCLUIR REGISTRO PERMANENTEMENTE?")) { await onDelete(item.id); onClose(); } }} className="w-full py-4 bg-red-950/20 text-red-500 border border-red-900/30 text-[9px] font-black uppercase flex items-center justify-center gap-2">
                   <Trash2 size={14} /> Excluir Permanentemente
                </button>
              )}
          </div>
      </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [items, setItems] = useState<GroupItem[]>([]);
  const [allData, setAllData] = useState<GroupItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GroupItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    const colls = ['ctv', 'telecom', 'painel', 'embarcados', 'tw_local', 'downloads'];
    const unsubs = colls.map((c, idx) => 
      onSnapshot(collection(db, c), (snap) => {
        const newItems = snap.docs.map(d => ({ id: d.id, ...d.data(), groupType: colls[idx] as GroupType } as GroupItem));
        setAllData(prev => [...prev.filter(i => i.groupType !== colls[idx]), ...newItems]);
      })
    );
    return () => unsubs.forEach(u => u());
  }, []);

  useEffect(() => {
    if (currentView === 'home') return;
    const q = query(collection(db, currentView), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })) as GroupItem[]));
  }, [currentView]);

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
      const isPainel = currentView === 'painel';
      const finalLocal = formData.local === "NOVO" ? formData.customLocal : formData.local;
      const finalEquip = formData.equipamento === "NOVO" ? formData.customEquipamento : formData.equipamento;
      
      let dataToSave: any = { ...formData };
      
      if (isPainel) {
          dataToSave = {
              "Tag": formData.tag,
              "Switch 1": formData.switch1,
              "Switch 2": formData.switch2,
              "Switch 3": formData.switch3,
              "Local Selecionável": finalLocal,
              "Equipamentos": finalEquip,
              "Observações": formData.obs
          };
      }

      if (location && currentView !== 'downloads') {
          dataToSave["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
          dataToSave["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}`;
      }

      const tag = formData.tag || formData.nome || "Novo Registro";
      await addDoc(collection(db, currentView), { 
        content: tag, 
        data: dataToSave, 
        userId: user.uid, 
        userEmail: user.email, 
        createdAt: serverTimestamp() 
      });
      setIsModalOpen(false);
      setFormData({});
      setLocation(null);
    } catch (e) { alert("Erro ao salvar"); } finally { setLoading(false); }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, currentView, id));
      setSelectedItem(null);
    } catch (e) {
      alert("Erro ao excluir registro.");
    }
  };

  if (currentView !== 'home') {
    const config = groupsConfig[currentView as GroupType];
    const isPainel = currentView === 'painel';
    
    const filteredItems = items.filter(item => {
      const s = normalizeText(searchTerm.trim());
      if (!s) return true;
      const searchable = [item.content, ...(item.data ? Object.values(item.data) : [])].map(v => normalizeText(String(v))).join(" ");
      return s.split(/\s+/).every(t => searchable.includes(t));
    });

    return (
      <div className="min-h-screen bg-slate-900 flex flex-col animate-fadeIn">
        <header className="bg-slate-800 border-b border-slate-700 p-4 sm:p-6 sticky top-0 z-50 flex justify-between items-center shadow-2xl">
           <div className="flex items-center gap-4 min-w-0">
              <button onClick={() => setCurrentView('home')} className="p-2.5 bg-slate-700 border border-slate-600"><ArrowLeft size={20} /></button>
              <h2 className="text-xl font-black uppercase tracking-tighter truncate">{config.label}</h2>
           </div>
           <button onClick={() => setIsModalOpen(true)} className={`${config.color} text-white px-5 py-3 font-black text-[10px] tracking-widest flex items-center gap-2 shadow-xl uppercase active:translate-y-0.5`}>
             <Plus size={16} /> NOVO
           </button>
        </header>

        <main className="flex-1 p-4 sm:p-12 space-y-6">
          <div className="max-w-4xl mx-auto relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder={`FILTRAR...`} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-12 pr-4 py-5 bg-slate-800 border border-slate-700 outline-none text-white font-black text-sm uppercase tracking-widest focus:border-blue-500 shadow-2xl" 
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <ItemCard 
                key={item.id} 
                item={item} 
                config={config} 
                onSelect={() => setSelectedItem(item)} 
                onDelete={handleDeleteItem}
                searchHighlight={searchTerm} 
              />
            ))}
          </div>
          
          {isModalOpen && (
            <div className="fixed inset-0 z-[400] bg-slate-900/95 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
               <div className="bg-slate-900 w-full max-w-xl h-[90vh] sm:h-auto border-t sm:border border-slate-700 flex flex-col overflow-hidden shadow-2xl">
                  <div className={`p-6 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center shadow-lg`}>
                    <h2 className="text-lg font-black uppercase">Novo Registro</h2>
                    <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                  </div>
                  <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto bg-slate-900">
                     {isPainel ? (
                       <div className="space-y-4">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Sincronização Satélite</label>
                             <button type="button" onClick={handleGetLocation} className={`w-full py-4 border text-[9px] font-black uppercase flex items-center justify-center gap-3 transition-all ${location ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-950 border-slate-800 text-blue-400'}`}>
                                {gettingLocation ? <Loader2 className="animate-spin" size={16}/> : location ? <CheckCircle className="text-emerald-500" size={16}/> : <Crosshair size={16}/>}
                                {location ? "GPS SINCRONIZADO" : "ATIVAR LOCALIZAÇÃO"}
                             </button>
                          </div>

                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Tag do Painel</label>
                             <input placeholder="TAG-XXX" required className="w-full p-4 bg-slate-950 border border-slate-800 text-white outline-none font-bold uppercase shadow-inner focus:border-orange-500" value={formData.tag || ""} onChange={e => setFormData({...formData, tag: e.target.value})} />
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                             <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-600 uppercase">Switch 1</label>
                                <input placeholder="IP/TAG" className="w-full p-3 bg-slate-950 border border-slate-800 outline-none text-[10px] font-bold text-white shadow-inner focus:border-blue-500" value={formData.switch1 || ""} onChange={e => setFormData({...formData, switch1: e.target.value})} />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-600 uppercase">Switch 2</label>
                                <input placeholder="IP/TAG" className="w-full p-3 bg-slate-950 border border-slate-800 outline-none text-[10px] font-bold text-white shadow-inner focus:border-blue-500" value={formData.switch2 || ""} onChange={e => setFormData({...formData, switch2: e.target.value})} />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-600 uppercase">Switch 3</label>
                                <input placeholder="IP/TAG" className="w-full p-3 bg-slate-950 border border-slate-800 outline-none text-[10px] font-bold text-white shadow-inner focus:border-blue-500" value={formData.switch3 || ""} onChange={e => setFormData({...formData, switch3: e.target.value})} />
                             </div>
                          </div>

                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Local</label>
                             <select required className="w-full p-4 bg-slate-950 border border-slate-800 font-bold uppercase text-xs outline-none text-white cursor-pointer shadow-inner focus:border-orange-500" value={formData.local || ""} onChange={e => setFormData({...formData, local: e.target.value, equipamento: '', customLocal: ''})}>
                                  <option value="">Selecione Local...</option>
                                  {Object.keys(SYSTEM_DATA).map(l => <option key={l} value={l}>{l}</option>)}
                                  <option value="NOVO">+ NOVO LOCAL</option>
                             </select>
                             {formData.local === "NOVO" && <input placeholder="NOME DO NOVO LOCAL" required value={formData.customLocal || ""} className="w-full p-4 bg-blue-900/10 border border-blue-800 text-white font-bold shadow-inner uppercase" onChange={e => setFormData({...formData, customLocal: e.target.value})} />}
                          </div>

                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Equipamentos</label>
                             <select required disabled={!formData.local} className="w-full p-4 bg-slate-950 border border-slate-800 font-bold uppercase text-xs outline-none disabled:opacity-30 text-white cursor-pointer shadow-inner focus:border-orange-500" value={formData.equipamento || ""} onChange={e => setFormData({...formData, equipamento: e.target.value, customEquipamento: ''})}>
                                  <option value="">Selecione Ativo...</option>
                                  {formData.local && formData.local !== "NOVO" && SYSTEM_DATA[formData.local]?.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                                  <option value="NOVO">+ NOVO EQUIPAMENTO</option>
                             </select>
                             {formData.equipamento === "NOVO" && <input placeholder="NOME DO NOVO ATIVO" required value={formData.customEquipamento || ""} className="w-full p-4 bg-blue-900/10 border border-blue-800 text-white font-bold shadow-inner uppercase" onChange={e => setFormData({...formData, customEquipamento: e.target.value})} />}
                          </div>

                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2"><MessageSquare size={12}/> Observações</label>
                             <textarea placeholder="..." className="w-full p-4 bg-slate-950 border border-slate-800 outline-none font-bold text-white min-h-[80px] uppercase shadow-inner focus:border-orange-500" value={formData.obs || ""} onChange={e => setFormData({...formData, obs: e.target.value})} />
                          </div>
                       </div>
                     ) : (
                       <div className="space-y-4">
                          <input placeholder="TAG / NOME" required className="w-full p-4 bg-slate-950 border border-slate-800 text-white outline-none font-bold uppercase shadow-inner" value={formData.tag || formData.nome || ""} onChange={e => setFormData({...formData, [currentView === 'downloads' ? 'nome' : 'tag']: e.target.value})} />
                          <input placeholder="LOCAL / CATEGORIA" className="w-full p-4 bg-slate-950 border border-slate-800 text-white outline-none font-bold uppercase shadow-inner" value={formData.local || formData.categoria || ""} onChange={e => setFormData({...formData, [currentView === 'downloads' ? 'categoria' : 'local']: e.target.value})} />
                          <input placeholder={currentView === 'downloads' ? "LINK (DRIVE/PDF)" : "IP / SWITCH"} required className="w-full p-4 bg-slate-950 border border-slate-800 text-white outline-none shadow-inner font-bold uppercase" value={formData.link || formData.ip || ""} onChange={e => setFormData({...formData, [currentView === 'downloads' ? 'link' : 'ip']: e.target.value})} />
                          <textarea placeholder="DESCRIÇÃO / OBS..." className="w-full p-4 bg-slate-950 border border-slate-800 outline-none font-bold text-white min-h-[100px] uppercase shadow-inner" value={formData.desc || formData.obs || ""} onChange={e => setFormData({...formData, [currentView === 'downloads' ? 'desc' : 'obs']: e.target.value})} />
                       </div>
                     )}
                     <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest shadow-2xl active:translate-y-1">
                        {loading ? <Loader2 className="animate-spin inline mr-2" /> : <Save className="inline mr-2" />} SALVAR NO BANCO
                     </button>
                  </form>
               </div>
            </div>
          )}
        </main>

        {selectedItem && (
          <ItemDetail 
            item={selectedItem} 
            groupKey={currentView} 
            config={config} 
            user={user} 
            onClose={() => setSelectedItem(null)} 
            onDelete={handleDeleteItem}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-14 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/5 blur-[150px] pointer-events-none"></div>
      
      {isMapModalOpen && (
        <GlobalMapModal 
          items={allData} 
          onClose={() => setIsMapModalOpen(false)} 
          onSelectItem={(item) => { 
            setCurrentView(item.groupType as GroupType); 
            setSelectedItem(item);
            setIsMapModalOpen(false); 
          }} 
        />
      )}

      <header className="flex justify-between items-center mb-10 border-b border-slate-800 pb-8">
        <div className="flex items-center gap-5">
           <div className="p-3 bg-blue-600 text-white shadow-[8px_8px_0px_rgba(30,58,138,0.5)]"><Database size={24} /></div>
           <div>
             <h1 className="text-xl sm:text-4xl font-black uppercase leading-none">TagFinder <span className="text-blue-500">Enterprise</span></h1>
             <p className="text-[7px] sm:text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mt-1">Asset Intelligence System &bull; 2024</p>
           </div>
        </div>
        <button onClick={() => signOut(auth)} className="p-4 bg-slate-900 border border-slate-800 text-slate-500 hover:text-red-500 transition-all shadow-xl"><LogOut size={20} /></button>
      </header>

      <div className="mb-10 animate-fadeIn">
        <h2 className="text-3xl sm:text-6xl font-black tracking-tighter uppercase leading-none text-white">Olá, <span className="text-blue-600">{user.email?.split('@')[0]}</span></h2>
        <div className="h-1.5 w-20 bg-blue-600 mt-5 mb-8"></div>
        
        {/* Botão de Mapa Geral como único acesso ao mapa na Home */}
        <button 
          onClick={() => setIsMapModalOpen(true)}
          className="group relative flex items-center gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-none hover:border-blue-500/50 transition-all shadow-2xl overflow-hidden active:translate-y-1"
        >
          <div className="p-3 bg-blue-600 text-white shadow-lg group-hover:scale-110 transition-transform"><Globe size={24} /></div>
          <div className="text-left">
             <h3 className="text-lg font-black uppercase text-white tracking-tighter">MAPA GERAL SATÉLITE</h3>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Visualizar todos os ativos em tempo real</p>
          </div>
          <ArrowRight className="ml-auto text-slate-700 group-hover:text-blue-500 transition-colors" size={24} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 pb-16 flex-1">
        {Object.entries(groupsConfig).map(([key, group]) => (
          <button key={key} onClick={() => setCurrentView(key as GroupType)} className="group bg-slate-900/60 border border-slate-800 p-6 sm:p-8 flex flex-col items-start transition-all hover:bg-slate-800 hover:border-blue-500/50 hover:-translate-y-1 shadow-2xl relative overflow-hidden active:translate-y-0 text-left">
             <div className="absolute top-0 right-0 p-8 bg-white/5 blur-3xl -mr-6 -mt-6"></div>
             <div className={`p-4 mb-6 ${group.lightColor} ${group.textColor} border border-slate-700 group-hover:scale-110 transition-transform`}><group.icon size={22} /></div>
             <h3 className="text-[11px] sm:text-lg font-black uppercase mb-2 text-white group-hover:text-blue-400 transition-colors leading-none">{group.label}</h3>
             <div className="flex items-center gap-2 text-[8px] sm:text-[9px] font-black text-slate-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all mt-auto">Acessar <ArrowRight size={10} /></div>
          </button>
        ))}
      </div>

      <footer className="mt-auto pt-8 border-t border-slate-900 text-center">
        <p className="text-[8px] sm:text-[10px] font-black text-slate-800 uppercase tracking-[0.8em] opacity-30 italic">Industrial Intelligence Engine &bull; V3.2.0</p>
      </footer>
    </div>
  );
};

export default Dashboard;