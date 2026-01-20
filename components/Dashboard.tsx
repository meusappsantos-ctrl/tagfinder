import React, { useState, useEffect, useRef } from 'react';
import { User, signOut } from 'firebase/auth';
// Use a more robust import method to avoid resolution issues with firestore exports
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
  createdAt: any | null; // Changed to any to avoid resolution issues with Timestamp type
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
  "SISTEMA 2": ["ee-1080ks-02", "