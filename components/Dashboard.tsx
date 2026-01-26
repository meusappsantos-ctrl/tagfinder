
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

// Added missing getDriveFileId function to fix reference error on line 232
const getDriveFileId = (url: string) => {
  if (!url) return null;
  const regex = /(?:\/d\/|id=)([\w-]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

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
    const map = L.map(mapRef.current, { 
        zoomControl: false, 
        maxZoom: 22,
        zoomSnap: 0.1,
        zoomDelta: 0.5,
        zoomAnimation: true,
        fadeAnimation: true
    }).setView([-15.7801, -47.9292], 4);

    L.tileLayer(GOOGLE_HYBRID_URL, { 
        maxZoom: 22, 
        maxNativeZoom: 20, 
        detectRetina: true, 
        attribution: SATELLITE_ATTRIBUTION 
    }).addTo(map);

    L.control.scale({ imperial: false, position: 'bottomright' }).addTo(map);
    
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
          
          const tagToDisplay = cleanTagName(item.data?.["Tag"] || item.data?.["Nome"] || "S/ TAG");
          
          const marker = L.circleMarker([lat, lng], { 
              radius: 10, 
              fillColor: color, 
              color: '#ffffff', 
              weight: 2, 
              opacity: 1, 
              fillOpacity: 1 
          });

          marker.bindTooltip(tagToDisplay, { 
              permanent: true, 
              direction: 'top', 
              className: `tag-label tag-label-${item.groupType}`, 
              offset: [0, -14] 
          });

          marker.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              onSelectItem(item);
          });

          layerGroupRef.current.addLayer(marker);
          bounds.extend([lat, lng]);
          hasGeo = true;
        }
      }
    });
    if (hasGeo) mapInstance.current.fitBounds(bounds, { padding: [100, 100], maxZoom: 18 });
  }, [items]);

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md">
      <div className="bg-slate-900 w-full h-[100vh] sm:h-[90vh] sm:max-w-6xl sm:rounded-[2.5rem] overflow-hidden flex flex-col border border-slate-700 shadow-2xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 backdrop-blur-xl relative z-20">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20"><Globe size={20} /></div>
             <div><h3 className="font-black text-white text-base tracking-tighter uppercase leading-none">Navegação Satélite de Ativos</h3><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Industrial Intelligence Engine</p></div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all border border-slate-700 text-slate-400"><X size={24} /></button>
        </div>
        <div className="flex-1 relative bg-black map-vignette"><div ref={mapRef} className="absolute inset-0 z-0" /></div>
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
          const cleanTitle = cleanTagName(finalData["Tag"] || finalData["Nome"] || item.content);
          await updateDoc(doc(db, groupKey, item.id), { data: finalData, content: cleanTitle });
          setIsEditing(false);
      } catch (e) { alert("ERRO AO SALVAR."); } finally { setIsSaving(false); }
  };

  return (
      <div className="fixed inset-0 z-[300] bg-slate-900 overflow-y-auto animate-fadeIn flex flex-col">
          <div className={`p-6 sm:p-10 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-20 shadow-xl`}>
              <div className="flex items-center gap-4"><button onClick={onClose} className="p-2 sm:p-3 bg-white/20 rounded-xl active:scale-95 transition-all shadow-lg"><ArrowLeft size={24} /></button><div><h2 className="text-xl sm:text-2xl font-black uppercase truncate max-w-[200px]">{isEditing ? "EDITAR" : (cleanTagName(editData["Tag"] || editData["Nome"] || "DETALHES"))}</h2><span className="text-[9px] font-black uppercase opacity-60 tracking-widest">{config.label}</span></div></div>
              <div className="flex gap-2">
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="px-5 py-2.5 bg-white/20 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 active:scale-95 transition-all shadow-lg"><Edit size={16} /> EDITAR</button>
                ) : <button onClick={() => setIsEditing(false)} className="p-3 bg-white/10 rounded-xl active:scale-95 transition-all shadow-lg"><X size={20} /></button>}
              </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-950 flex flex-col pb-10">
              <div className="p-6 sm:p-12 space-y-10">
                  <div className="bg-blue-500/5 border border-blue-500/10 p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                      <div className="absolute top-0 right-0 p-12 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
                         <div className="flex items-center gap-6">
                            <div className={`p-6 rounded-3xl ${config.lightColor} ${config.textColor} shadow-xl border border-white/10`}><config.icon size={40} /></div>
                            <div>
                               <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{cleanTagName(editData["Tag"] || editData["Nome"] || "Ficha Técnica")}</h3>
                               <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1 flex items-center gap-2"><CheckCircle size={12} className="text-emerald-500" /> Registro Ativo no Sistema</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                               <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Categoria Técnica</p>
                               <p className="text-sm font-black text-white uppercase">{config.label}</p>
                            </div>
                            <div className="w-px h-10 bg-slate-800 hidden sm:block"></div>
                            <Activity size={24} className="text-blue-500 animate-pulse" />
                         </div>
                      </div>
                  </div>

                  {!isDownload ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
                          <div className="flex items-center gap-5 relative z-10">
                            <div className={`p-4 rounded-2xl border ${location ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                <MapPin size={24} />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase">GPS COORDENADAS</h4>
                                <p className="text-sm font-mono truncate mt-1 tracking-tight">{location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : "S/ GPS"}</p>
                            </div>
                          </div>
                          {location && !isEditing && (
                              <div className="grid grid-cols-2 gap-3 relative z-10 mt-2">
                                  <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`, '_blank')} className="py-4 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95"><Navigation size={14} /> COMO CHEGAR</button>
                                  <button onClick={() => window.open(`https://earth.google.com/web/search/${location.lat},${location.lng}`, '_blank')} className="py-4 bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-xl border border-slate-700 transition-all active:scale-95"><Globe size={14} /> EARTH</button>
                              </div>
                          )}
                      </div>
                      <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 flex items-center gap-5 shadow-2xl">
                          <div className="p-4 bg-slate-800 text-slate-400 rounded-2xl border border-slate-700 shadow-lg"><Clock size={24} /></div>
                          <div>
                              <h4 className="text-[10px] font-black text-slate-500 uppercase">Data Registro</h4>
                              <p className="text-sm font-black uppercase mt-1 tracking-tight">{item.createdAt ? (item.createdAt.toDate ? item.createdAt.toDate().toLocaleDateString('pt-BR') : "---") : "---"}</p>
                          </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <button onClick={() => window.open(originalLink, '_blank')} className="p-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-3xl flex flex-col items-center justify-center gap-2 font-black uppercase text-xs shadow-2xl transition-all active:scale-95 group">
                              <ExternalLink size={24} className="group-hover:scale-110 transition-transform" /> ABRIR NO DRIVE
                           </button>
                           <button onClick={() => window.open(directDownloadUrl, '_blank')} className="p-6 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-3xl flex flex-col items-center justify-center gap-2 font-black uppercase text-xs shadow-2xl transition-all active:scale-95 group">
                              <FileDown size={24} className="group-hover:translate-y-1 transition-transform" /> DOWNLOAD DIRETO
                           </button>
                        </div>
                        {previewUrl && !isEditing && (
                           <div className="space-y-4">
                              <div className="flex items-center justify-between px-2">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Eye size={14} className="text-cyan-500" /> Pré-visualização</h4>
                              </div>
                              <div className="w-full aspect-[4/3] sm:aspect-video bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                                 <iframe src={previewUrl} className="w-full h-full border-none" allow="autoplay; encrypted-media"></iframe>
                              </div>
                           </div>
                        )}
                    </div>
                  )}
                  {location && !isEditing && !isDownload && <MiniMapPreview lat={location.lat} lng={location.lng} tag={editData["Tag"]} />}
                  <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-2 flex items-center gap-2"><Database size={14} className="text-blue-500" /> Detalhes Técnicos do Equipamento</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Object.entries(editData).map(([key, value]) => isKeyVisible(key) && (
                              <div key={key} className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/60 shadow-lg group hover:border-blue-500/30 transition-all">
                                <h5 className="text-[9px] font-black text-slate-600 uppercase mb-3 opacity-70">{key}</h5>
                                {isEditing ? <input type="text" value={String(value)} onChange={(e) => setEditData({ ...editData, [key]: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none font-bold uppercase focus:border-blue-500 transition-all shadow-inner" /> : <p className="text-white font-black text-sm uppercase break-all">{String(value)}</p>}
                              </div>
                          ))}
                      </div>
                  </div>
                  {isEditing && (
                      <div className="pt-10 flex justify-center">
                          <button onClick={handleSave} disabled={isSaving} className={`max-w-md w-full py-5 rounded-2xl text-white font-black uppercase text-[10px] ${config.color} shadow-2xl flex justify-center items-center gap-3 active:scale-95 transition-all`}>{isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16} />} SALVAR ALTERAÇÕES</button>
                      </div>
                  )}
              </div>
          </div>
      </div>
  );
};

const ItemCard: React.FC<{ item: GroupItem; config: any; onSelect: () => void; searchHighlight: string; }> = ({ item, config, onSelect, searchHighlight }) => {
  const data = item.data || {};
  const isTW = config.id === 'tw_local';
  const isDownload = config.id === 'downloads';
  const isPainel = config.id === 'painel';
  
  const tagValue = cleanTagName(data["Tag"] || data["Nome"] || item.content);
  const hasGeo = !!data["Geolocalização"];

  return (
    <div onClick={onSelect} className="relative flex flex-col bg-slate-800/40 backdrop-blur-xl rounded-[1.5rem] border border-slate-700/60 p-1 shadow-lg hover:shadow-2xl transition-all cursor-pointer active:scale-95 group overflow-hidden">
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-white truncate tracking-tighter uppercase group-hover:text-blue-400 transition-colors flex-1">
            <HighlightedText text={tagValue} highlight={searchHighlight} />
          </h3>
          <div className="flex items-center gap-1">
            <div className={`p-2 rounded-lg ${hasGeo || isDownload ? (isDownload ? 'bg-cyan-500/10 text-cyan-500' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20') : 'bg-slate-700 text-slate-500'}`}>
              {isDownload ? <FileText size={14} /> : (isTW ? <Locate size={14} /> : <MapPin size={14} />)}
            </div>
          </div>
        </div>
        
        {!isTW && (
          <div className="flex items-center gap-2 text-slate-400 bg-slate-900/30 px-3 py-1.5 rounded-lg border border-white/5">
            <span className="text-[9px] font-black truncate tracking-tight uppercase">
              <HighlightedText text={data["Local Selecionável"] || data["Local"] || data["Categoria"] || "S/ LOCAL"} highlight={searchHighlight} />
            </span>
          </div>
        )}

        {isTW && (
            <div className="space-y-1.5 mt-1 animate-fadeIn">
                <div className="px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-[9px] text-purple-300 flex items-center gap-2 shadow-sm">
                    <Locate size={12} className="text-purple-500" />
                    <span className="truncate tracking-widest uppercase font-black">
                        <HighlightedText text={tagValue} highlight={searchHighlight} />
                    </span>
                </div>
                <div className="px-3 py-2 bg-slate-900/40 rounded-xl text-[8px] text-slate-400 flex items-center gap-2 border border-white/5">
                    <MapPin size={10} className="text-purple-600" />
                    <span className="uppercase font-black truncate">ÁREA: <HighlightedText text={data["Local"] || "S/ LOCAL"} highlight={searchHighlight} /></span>
                </div>
            </div>
        )}

        {isPainel && (
            <div className="space-y-2 mt-1 animate-fadeIn">
                {data["Equipamento"] && (
                    <div className="px-2 py-1 bg-orange-500/10 border border-orange-500/20 rounded text-[8px] text-orange-400 font-black uppercase tracking-tighter truncate">
                        <HighlightedText text={data["Equipamento"]} highlight={searchHighlight} />
                    </div>
                )}
                <div className="flex flex-wrap gap-1">
                    {['Switch1', 'Switch2', 'Switch3'].map(sw => data[sw] && (
                        <div key={sw} className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-700/30 rounded text-[7px] text-slate-300 font-bold border border-white/5">
                            <Activity size={10} className="text-blue-400" />
                            <span className="uppercase">{sw.replace('Switch', 'SW')}: <HighlightedText text={data[sw]} highlight={searchHighlight} /></span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="flex items-center justify-between text-[8px] font-black text-slate-500 pt-2 border-t border-white/5 uppercase tracking-widest mt-auto">
           <div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${hasGeo || isDownload ? (isDownload ? 'bg-cyan-500' : 'bg-emerald-500 animate-pulse') : 'bg-slate-600'}`}></div>{config.label}</div>
           <span>{isDownload ? 'NUVEM OK' : (hasGeo ? 'GPS OK' : 'SEM GPS')}</span>
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
  const [formData, setFormData] = useState<any>({ tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', equipamento: '', customLocal: '', customEquipamento: '', obs: '', desc: '', link: '', nome: '' });
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      () => { setGettingLocation(false); alert('GPS Falhou'); },
      { enableHighAccuracy: true }
    );
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const wb = XLSX.read(evt.target?.result, { type: 'binary' });
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            const batch = writeBatch(db);
            data.forEach((row: any) => {
                const keys = Object.keys(row);
                const tagKey = keys.find(k => ["TAG", "Tag", "Nome", "Identificador", "ITEM", "Item"].includes(k.trim().toUpperCase()));
                const localKey = keys.find(k => ["LOCAL", "Local", "AREA", "Area", "Categoria"].includes(k.trim().toUpperCase()));
                const latKey = keys.find(k => ["LATITUDE", "Lat", "LAT"].includes(k.trim().toUpperCase()));
                const lngKey = keys.find(k => ["LONGITUDE", "Long", "LNG", "LON"].includes(k.trim().toUpperCase()));
                
                const rowTag = tagKey ? String(row[tagKey]) : "Item";
                const rowLocal = localKey ? String(row[localKey]) : "S/ Local";
                
                let itemData: any = { "Tag": rowTag, "Local": rowLocal };
                keys.forEach(k => { if(!k.startsWith('__')) itemData[k] = String(row[k]); });

                if (latKey && lngKey && row[latKey] && row[lngKey]) {
                   itemData["Geolocalização"] = `${row[latKey]}, ${row[lngKey]}`;
                   itemData["Link Maps"] = `https://maps.google.com/?q=${row[latKey]},${row[lngKey]}`;
                }

                const newDoc = doc(collection(db, groupKey));
                batch.set(newDoc, { 
                  content: cleanTagName(rowTag), 
                  data: itemData, 
                  userId: user.uid, 
                  userEmail: user.email, 
                  createdAt: serverTimestamp() 
                });
            });
            await batch.commit();
            alert("IMPORTADO COM SUCESSO!");
        } catch (e) { alert("ERRO NA IMPORTAÇÃO."); } finally { setImporting(false); }
    };
    reader.readAsBinaryString(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let data: any = {};
      const finalLocal = formData.local === "NOVO" ? formData.customLocal : formData.local;
      const finalEquip = formData.equipamento === "NOVO" ? formData.customEquipamento : formData.equipamento;
      
      if (groupKey === 'painel') {
          data = { "Tag do Painel": formData.tag, "Tag": formData.tag, "Local Selecionável": finalLocal, "Switch 1": formData.switch1, "Switch1": formData.switch1, "Switch 2": formData.switch2, "Switch2": formData.switch2, "Switch 3": formData.switch3, "Switch3": formData.switch3, "Equipamento": finalEquip, "Observação": formData.obs };
      } else if (groupKey === 'tw_local') {
          data = { "Tag": formData.tag, "Local": finalLocal, "Descrição": formData.desc };
      } else if (groupKey === 'downloads') {
          data = { "Nome": formData.nome, "Categoria": formData.local, "Link": formData.link, "Descrição": formData.desc };
      } else {
          data = { "Tag": formData.tag, "Local": finalLocal, "IP / Equipamento": formData.ip };
      }

      if (location && groupKey !== 'downloads') {
          data["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
          data["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}`;
      }
      
      const tagLabel = cleanTagName(formData.tag || formData.nome || "S/ Tag");
      await addDoc(collection(db, groupKey), { 
        content: tagLabel, 
        data, 
        userId: user.uid, 
        userEmail: user.email, 
        createdAt: serverTimestamp() 
      });
      setIsModalOpen(false);
      setFormData({ tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', equipamento: '', customLocal: '', customEquipamento: '', obs: '', desc: '', link: '', nome: '' });
      setLocation(null);
    } catch (e) { alert('Erro'); } finally { setLoading(false); }
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
      <div className={`p-6 sm:p-10 mb-8 bg-slate-800/60 rounded-[2.5rem] border border-slate-700 flex flex-col gap-6 relative overflow-hidden`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-3 bg-slate-700 rounded-xl text-slate-300 hover:bg-slate-600 active:scale-95 transition-all"><ArrowLeft size={24} /></button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <div className={`p-1 rounded bg-gradient-to-br ${config.gradient} text-white`}><Icon size={12} /></div>
                 <span className="text-[9px] uppercase tracking-widest font-black text-slate-500">{config.label}</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter leading-none">{groupKey === 'downloads' ? 'Arquivos & Links' : 'Inventário Industrial'}</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {groupKey !== 'downloads' && (
              <>
                <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls, .csv" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="flex px-5 py-3 rounded-xl text-slate-300 bg-slate-700/50 border border-slate-600 font-black uppercase text-[10px] tracking-widest items-center gap-2 hover:bg-slate-700 transition-all shadow-lg active:scale-95">
                  {importing ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />} Importar Excel
                </button>
              </>
            )}
            <button onClick={() => setIsModalOpen(true)} className={`flex px-6 py-3 rounded-xl text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-[10px] tracking-widest items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all`}>
              <Plus size={16} /> Novo Cadastro
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 mb-8 max-w-4xl mx-auto">
        <div className="relative group">
          <div className={`absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none transition-colors ${searchTerm ? config.textColor : 'text-slate-500'}`}><Search size={20} /></div>
          <input type="text" placeholder={`Buscar em ${config.label}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-14 pr-14 py-5 bg-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-3xl text-white outline-none font-bold placeholder-slate-600 shadow-2xl focus:border-blue-500/50 transition-all" />
        </div>
      </div>

      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredItems.map(item => <ItemCard key={item.id} item={item} config={config} onSelect={() => setSelectedItem(item)} searchHighlight={searchTerm} />)}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-center opacity-50"><FilterX size={64} className="text-slate-700 mb-6" /><h3 className="text-xl font-black text-white uppercase tracking-tight">Sem resultados</h3></div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-slate-800 w-full h-[95vh] sm:h-auto sm:max-w-lg sm:rounded-[2.5rem] border-t sm:border border-slate-600 overflow-y-auto">
            <div className={`p-6 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-10 shadow-xl`}><h3 className="text-xl font-black uppercase">Novo Registro Técnico</h3><button onClick={() => setIsModalOpen(false)} className="p-2 bg-white/10 rounded-lg"><X size={20} /></button></div>
            <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6">
              {groupKey === 'painel' ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Tag do Painel</label>
                    <input type="text" placeholder="Ex: vc-1080ks-13.06" required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-base font-black outline-none focus:border-blue-500 transition-all uppercase shadow-inner" />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Switch 1</label>
                      <input type="text" placeholder="IP / TAG" value={formData.switch1} onChange={e => setFormData({...formData, switch1: e.target.value})} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-[10px] font-black outline-none focus:border-blue-500 transition-all uppercase shadow-inner" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Switch 2</label>
                      <input type="text" placeholder="IP / TAG" value={formData.switch2} onChange={e => setFormData({...formData, switch2: e.target.value})} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-[10px] font-black outline-none focus:border-blue-500 transition-all uppercase shadow-inner" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Switch 3</label>
                      <input type="text" placeholder="IP / TAG" value={formData.switch3} onChange={e => setFormData({...formData, switch3: e.target.value})} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-[10px] font-black outline-none focus:border-blue-500 transition-all uppercase shadow-inner" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Local Selecionável</label>
                    <select required value={formData.local} onChange={e => setFormData({...formData, local: e.target.value, equipamento: ''})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-xs font-black uppercase outline-none focus:border-blue-500 appearance-none cursor-pointer shadow-inner">
                      <option value="">Selecione Local...</option>
                      {Object.keys(SYSTEM_DATA).map(loc => <option key={loc} value={loc}>{loc}</option>)}
                      <option value="NOVO">+ CADASTRAR NOVO LOCAL</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Equipamento (Dependente)</label>
                    <select required disabled={!formData.local} value={formData.equipamento} onChange={e => setFormData({...formData, equipamento: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-xs font-black uppercase outline-none focus:border-blue-500 appearance-none cursor-pointer shadow-inner disabled:opacity-30">
                      <option value="">Selecione Ativo...</option>
                      {formData.local && formData.local !== "NOVO" && SYSTEM_DATA[formData.local]?.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                      <option value="NOVO">+ CADASTRAR NOVO ATIVO</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2 tracking-widest"><MapPin size={12} /> Localização GPS</label>
                    <button type="button" onClick={handleGetLocation} className="w-full py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-[10px] font-black uppercase text-blue-400 flex items-center justify-center gap-3 active:scale-95 transition-all shadow-inner">
                      {gettingLocation ? <Loader2 className="animate-spin" size={16}/> : location ? <CheckCircle className="text-emerald-500" size={16}/> : <Crosshair size={16}/>}
                      {location ? "GPS ATIVADO E SINCRONIZADO" : "ATIVAR LOCALIZAÇÃO (GPS)"}
                    </button>
                    {location && <MiniMapPreview lat={location.lat} lng={location.lng} tag={formData.tag} />}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2 tracking-widest"><MessageSquare size={12} /> Observação</label>
                    <textarea placeholder="Notas técnicas, pendências ou detalhes da instalação..." value={formData.obs} onChange={e => setFormData({...formData, obs: e.target.value})} className="w-full px-5 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white text-xs font-bold outline-none focus:border-blue-500 min-h-[100px] shadow-inner" />
                  </div>
                </div>
              ) : groupKey === 'tw_local' ? (
                <div className="space-y-5">
                  <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 ml-1 uppercase">Tag / Marco TW (ex: TW-1080KS-50)</label>
                      <input type="text" placeholder="TW-..." required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm font-black uppercase outline-none focus:border-blue-500 shadow-inner" />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 ml-1 uppercase">Descrição Local TW</label>
                      <input type="text" placeholder="Marco de Manobra" value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm font-black uppercase outline-none shadow-inner" />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 ml-1 uppercase">Área Operacional</label>
                      <input type="text" placeholder="Geral" value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm font-black uppercase outline-none shadow-inner" />
                  </div>
                  <button type="button" onClick={handleGetLocation} className={`w-full py-4 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${location ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-blue-400 border border-slate-600'}`}>
                    {gettingLocation ? <Loader2 className="animate-spin" size={14}/> : location ? <CheckCircle size={14}/> : <Crosshair size={14}/>} {location ? "GPS OK" : "CAPTURAR GPS"}
                  </button>
                </div>
              ) : groupKey === 'downloads' ? (
                <div className="space-y-5">
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 ml-1 uppercase">Título / Nome do Arquivo</label>
                      <input type="text" placeholder="Manual Técnico" required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm font-black uppercase outline-none shadow-inner" />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 ml-1 uppercase">Link (Google Drive / Direct)</label>
                      <input type="url" placeholder="https://drive.google.com/..." required value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm font-mono outline-none shadow-inner" />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 ml-1 uppercase">Categoria</label>
                      <input type="text" placeholder="Manuais" value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm font-black uppercase outline-none shadow-inner" />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 ml-1 uppercase">Descrição</label>
                      <textarea placeholder="..." value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm font-bold outline-none shadow-inner min-h-[80px]" />
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 ml-1 uppercase">Tag / Identificador</label>
                      <input type="text" placeholder="TAG-001" required value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm font-black uppercase outline-none focus:border-blue-500 shadow-inner" />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 ml-1 uppercase">Localização Técnica</label>
                      <input type="text" placeholder="Área Norte" value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm font-black uppercase outline-none shadow-inner" />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 ml-1 uppercase">IP / Equipamento</label>
                      <input type="text" placeholder="10.x.x.x" value={formData.ip} onChange={e => setFormData({...formData, ip: e.target.value})} className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm font-mono uppercase outline-none shadow-inner" />
                  </div>
                  <button type="button" onClick={handleGetLocation} className={`w-full py-4 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${location ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-blue-400 border border-slate-600'}`}>
                    {gettingLocation ? <Loader2 className="animate-spin" size={14}/> : location ? <CheckCircle size={14}/> : <Crosshair size={14}/>} {location ? "GPS OK" : "CAPTURAR GPS"}
                  </button>
                </div>
              )}
              <button type="submit" disabled={loading} className={`w-full py-5 rounded-2xl text-white bg-gradient-to-r ${config.gradient} font-black uppercase text-[10px] shadow-2xl transition-all active:scale-95 ring-1 ring-white/10`}>
                 {loading ? <Loader2 className="animate-spin" size={20}/> : "SALVAR CADASTRO NO INVENTÁRIO"}
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

  const handleOpenGlobalMap = async () => {
    setLoadingMap(true);
    try { setIsMapModalOpen(true); } catch (e) {} finally { setLoadingMap(false); }
  };

  if (currentView !== 'home') return <div className="min-h-screen bg-slate-900 p-4 sm:p-12"><div className="max-w-7xl mx-auto"><GroupPage groupKey={currentView} user={user} onBack={() => { setCurrentView('home'); setItemFromSearch(null); }} initialSelectedItem={itemFromSearch} /></div></div>;

  return (
    <div className="min-h-screen bg-slate-900 p-6 sm:p-14 text-white relative overflow-hidden flex flex-col">
      <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-blue-600/5 blur-[150px] rounded-full pointer-events-none"></div>
      {isMapModalOpen && <GlobalMapModal items={allData} onClose={() => setIsMapModalOpen(false)} onSelectItem={(item) => { 
          setItemFromSearch(item); 
          setCurrentView(item.groupType as GroupType); 
          setIsMapModalOpen(false); 
      }} />}
      <div className="max-w-6xl mx-auto w-full space-y-12 animate-fadeIn relative z-10 flex-1">
        <header className="flex flex-col gap-10">
          <div className="flex justify-between items-center">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[8px] font-black uppercase tracking-widest text-blue-400 shadow-2xl"><IdCard size={16} /> TAGFINDER Enterprise</div>
            <button onClick={() => signOut(auth)} className="p-4 bg-slate-800 border border-slate-700 rounded-2xl text-slate-500 hover:text-red-500 transition-all shadow-2xl active:scale-95"><LogOut size={22} /></button>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            <div><h1 className="text-3xl sm:text-5xl font-black tracking-tighter leading-tight uppercase">Olá, <span className="text-blue-500">{user.email?.split('@')[0]}</span></h1><p className="text-slate-500 text-xs font-black uppercase tracking-widest mt-4 opacity-70 border-l-4 border-blue-600 pl-4 italic">Gestão e Inventário Industrial</p></div>
            <button onClick={handleOpenGlobalMap} disabled={loadingMap} className="group relative overflow-hidden flex items-center gap-6 bg-slate-800/60 p-6 sm:p-8 rounded-[2.5rem] border border-slate-700 shadow-2xl transition-all hover:border-blue-500/30 text-left active:scale-95"><div className="absolute top-0 right-0 p-24 bg-blue-600/10 rounded-full blur-[60px] -mr-12 -mt-12 transition-all group-hover:bg-blue-600/20"></div><div className="p-4 sm:p-5 bg-blue-500/10 text-blue-400 rounded-2xl group-hover:scale-110 transition-transform shadow-xl relative z-10">{loadingMap ? <Loader2 className="animate-spin" size={32}/> : <Globe size={32} />}</div><div className="relative z-10"><h3 className="text-xl sm:text-2xl font-black text-white tracking-tighter uppercase leading-none">Mapa Geral</h3><p className="text-slate-500 text-[10px] font-black uppercase mt-2">Visão Fotorealista</p></div></button>
          </div>
        </header>
        <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6 pb-20">
          {Object.entries(groupsConfig).map(([key, group]) => (
             <button key={key} onClick={() => setCurrentView(key as GroupType)} className="relative overflow-hidden group bg-slate-900/60 p-6 sm:p-8 rounded-[2rem] border border-slate-800/80 flex flex-col items-start transition-all active:scale-95 shadow-2xl hover:bg-slate-800 hover:border-white/10">
               <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl ${group.lightColor} ${group.textColor} flex items-center justify-center mb-6 ring-4 ring-white/5 group-hover:scale-110 transition-transform border border-white/5 shadow-xl`}><group.icon size={32} /></div>
               <h2 className="text-xs sm:text-lg font-black mb-3 tracking-tighter uppercase leading-tight group-hover:text-blue-400 transition-colors">{group.label}</h2>
               <div className={`inline-flex items-center gap-2 font-black text-[7px] sm:text-[9px] uppercase tracking-widest ${group.textColor} opacity-60 group-hover:opacity-100`}>Acessar <ArrowRight size={12} /></div>
             </button>
          ))}
        </section>
      </div>
      <footer className="py-12 text-center border-t border-white/5 mt-auto bg-slate-900/40 backdrop-blur-md"><p className="text-[9px] font-black text-slate-700 uppercase tracking-widest opacity-40">TagFinder Enterprise &bull; 2024</p></footer>
    </div>
  );
};

export default Dashboard;
