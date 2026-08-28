export type DashboardLanguage = 'en' | 'fr';

export interface DashboardTranslations {
  nav: {
    status: string;
    sessions: string;
    tools: string;
    apikeys: string;
    agents: string;
    capabilities: string;
    lines: string;
    metrics: string;
    logout: string;
  };
  login: {
    title: string;
    subtitle: string;
    usernamePlaceholder: string;
    passwordPlaceholder: string;
    submit: string;
    submitting: string;
    defaultError: string;
  };
  status: {
    title: string;
    errorPrefix: string;
    loading: string;
    uptime: string;
    version: string;
    activeSessions: string;
    activeConnections: string;
    serverTools: string;
    pendingToolCalls: string;
    livekitRooms: string;
    livekitOpsTitle: string;
    bridgeActive: string;
    bridgeInactive: string;
    roomName: string;
    participants: string;
    emptyRooms: string;
    serverToolsTitle: string;
    noServerTools: string;
    recentEventsTitle: string;
    noEvents: string;
  };
  sessions: {
    title: string;
    loading: string;
    noSessions: string;
    active: string;
    ended: string;
    session: string;
    clientIp: string;
    startedAt: string;
    duration: string;
    messages: string;
    toolCalls: string;
    audioMode: string;
    actions: string;
    viewDetails: string;
    filterAll: string;
    filterActive: string;
  };
  sessionDetail: {
    backToSessions: string;
    title: string;
    loading: string;
    notFound: string;
    infoTab: string;
    transcriptTab: string;
    toolsTab: string;
    memoryTab: string;
    graphTab: string;
    sessionId: string;
    status: string;
    clientIp: string;
    startedAt: string;
    endedAt: string;
    audioMode: string;
    tokenUsage: string;
    inputTokens: string;
    outputTokens: string;
    totalTokens: string;
    noTranscript: string;
    noToolCalls: string;
    noMemory: string;
    userRole: string;
    agentRole: string;
    systemRole: string;
    toolCallName: string;
    toolCallStatus: string;
    toolCallDuration: string;
  };
  tools: {
    title: string;
    subtitle: string;
    loading: string;
    noTools: string;
    serverTools: string;
    clientTools: string;
    name: string;
    description: string;
    risk: string;
    origin: string;
    parameters: string;
    schema: string;
    serverOrigin: string;
    clientOrigin: string;
  };
  apikeys: {
    title: string;
    subtitle: string;
    loading: string;
    createKeyBtn: string;
    createModalTitle: string;
    keyName: string;
    keyNamePlaceholder: string;
    rateLimit: string;
    rateLimitPlaceholder: string;
    allowedOrigins: string;
    allowedOriginsPlaceholder: string;
    createBtn: string;
    cancelBtn: string;
    nameCol: string;
    prefixCol: string;
    rateLimitCol: string;
    originsCol: string;
    createdCol: string;
    actionsCol: string;
    revokeBtn: string;
    revokeConfirm: string;
    noKeys: string;
    keyCreatedNotice: string;
    copyKeyNotice: string;
    closeBtn: string;
  };
  agents: {
    title: string;
    subtitle: string;
    loading: string;
    noAgents: string;
    agentName: string;
    model: string;
    systemPrompt: string;
    apiKey: string;
    editBtn: string;
    saveBtn: string;
    cancelBtn: string;
    promptUpdatedNotice: string;
  };
  capabilities: {
    title: string;
    subtitle: string;
    loading: string;
    serverInfo: string;
    version: string;
    activeProvider: string;
    audioCapabilities: string;
    liveMode: string;
    hybridMode: string;
    sttProvider: string;
    ttsProvider: string;
    availableModels: string;
    supportsAudio: string;
    supportsTools: string;
    livekitBridge: string;
    bridgeStatus: string;
    voiceRuntimeConfig: string;
    readOnlyNotice: string;
    saveVoiceConfig: string;
  };
  lines: {
    title: string;
    subtitle: string;
    loading: string;
    noLines: string;
    disabled: string;
    poolName: string;
    maxConcurrency: string;
    activeLines: string;
    busyLines: string;
    queueLength: string;
    allocatedTokens: string;
    available: string;
    busy: string;
    total: string;
    forceRelease: string;
    acquireLine: string;
    releaseLine: string;
    waiting: string;
  };
  metrics: {
    title: string;
    subtitle: string;
    loading: string;
    requestsPerSec: string;
    avgLatency: string;
    totalTokenUsage: string;
    errorRate: string;
    hourlyTraffic: string;
    tokenConsumption: string;
  };
  common: {
    search: string;
    filter: string;
    refresh: string;
    active: string;
    inactive: string;
    enabled: string;
    disabled: string;
    unknown: string;
    none: string;
    success: string;
    error: string;
    warning: string;
    na: string;
    yes: string;
    no: string;
    language: string;
  };
}

export const translations: Record<DashboardLanguage, DashboardTranslations> = {
  en: {
    nav: {
      status: 'Status',
      sessions: 'Sessions',
      tools: 'Tools',
      apikeys: 'API Keys',
      agents: 'Agents',
      capabilities: 'Configuration',
      lines: 'Virtual Lines',
      metrics: 'Metrics',
      logout: 'Logout',
    },
    login: {
      title: 'OwlLayer Admin',
      subtitle: 'Sign in to your administration dashboard',
      usernamePlaceholder: 'Username',
      passwordPlaceholder: 'Password',
      submit: 'Sign In',
      submitting: 'Signing in...',
      defaultError: 'Invalid credentials or server unavailable.',
    },
    status: {
      title: 'Server Status',
      errorPrefix: 'Error: ',
      loading: 'Loading server status...',
      uptime: 'Uptime',
      version: 'Version',
      activeSessions: 'Active Sessions',
      activeConnections: 'Active Connections',
      serverTools: 'Server Tools',
      pendingToolCalls: 'Pending Tool Calls',
      livekitRooms: 'LiveKit Rooms',
      livekitOpsTitle: 'LiveKit Bridge Operations',
      bridgeActive: 'Bridge Active',
      bridgeInactive: 'Bridge Inactive',
      roomName: 'Room Name',
      participants: 'Participants',
      emptyRooms: 'No active LiveKit rooms',
      serverToolsTitle: 'Registered Server Tools',
      noServerTools: 'No server tools registered',
      recentEventsTitle: 'Recent Events',
      noEvents: 'No recent events recorded',
    },
    sessions: {
      title: 'Sessions',
      loading: 'Loading sessions...',
      noSessions: 'No sessions found',
      active: 'Active',
      ended: 'Ended',
      session: 'Session',
      clientIp: 'Client IP',
      startedAt: 'Started At',
      duration: 'Duration',
      messages: 'Messages',
      toolCalls: 'Tool Calls',
      audioMode: 'Audio Mode',
      actions: 'Actions',
      viewDetails: 'View Details',
      filterAll: 'All Sessions',
      filterActive: 'Active Only',
    },
    sessionDetail: {
      backToSessions: '← Back to Sessions',
      title: 'Session Details',
      loading: 'Loading session details...',
      notFound: 'Session not found or has expired.',
      infoTab: 'Overview',
      transcriptTab: 'Transcript',
      toolsTab: 'Tool Calls',
      memoryTab: 'Agent Memory',
      graphTab: 'Execution Graph',
      sessionId: 'Session ID',
      status: 'Status',
      clientIp: 'Client IP',
      startedAt: 'Started At',
      endedAt: 'Ended At',
      audioMode: 'Audio Mode',
      tokenUsage: 'Token Usage',
      inputTokens: 'Input Tokens',
      outputTokens: 'Output Tokens',
      totalTokens: 'Total Tokens',
      noTranscript: 'No messages in this session transcript.',
      noToolCalls: 'No tool calls executed in this session.',
      noMemory: 'No agent memory snapshot available for this session.',
      userRole: 'User',
      agentRole: 'Assistant',
      systemRole: 'System',
      toolCallName: 'Tool Name',
      toolCallStatus: 'Status',
      toolCallDuration: 'Duration',
    },
    tools: {
      title: 'Tools & Capabilities',
      subtitle: 'Explore available server and client-side agent tools',
      loading: 'Loading tools...',
      noTools: 'No tools currently registered',
      serverTools: 'Server Tools',
      clientTools: 'Client Tools (Live)',
      name: 'Name',
      description: 'Description',
      risk: 'Risk Level',
      origin: 'Origin',
      parameters: 'Parameters',
      schema: 'JSON Schema',
      serverOrigin: 'Server-side',
      clientOrigin: 'Client-side',
    },
    apikeys: {
      title: 'API Keys',
      subtitle: 'Manage client authentication tokens and access policies',
      loading: 'Loading API keys...',
      createKeyBtn: '+ Create API Key',
      createModalTitle: 'Create New API Key',
      keyName: 'Key Name / Label',
      keyNamePlaceholder: 'e.g. ShopMate Web App',
      rateLimit: 'Rate Limit (req/min)',
      rateLimitPlaceholder: '60',
      allowedOrigins: 'Allowed Origins (comma-separated)',
      allowedOriginsPlaceholder: 'http://localhost:3000, https://app.example.com',
      createBtn: 'Generate Key',
      cancelBtn: 'Cancel',
      nameCol: 'Name',
      prefixCol: 'Key Prefix',
      rateLimitCol: 'Rate Limit',
      originsCol: 'Allowed Origins',
      createdCol: 'Created At',
      actionsCol: 'Actions',
      revokeBtn: 'Revoke',
      revokeConfirm: 'Are you sure you want to revoke this API key? Active connections using it will be terminated.',
      noKeys: 'No API keys configured',
      keyCreatedNotice: 'API key successfully created! Copy it now; you will not be able to see it again.',
      copyKeyNotice: 'Click to copy full key',
      closeBtn: 'Close',
    },
    agents: {
      title: 'Agent Configurations',
      subtitle: 'Customize model behavior and system prompts by client profile',
      loading: 'Loading agent profiles...',
      noAgents: 'No custom agent profiles configured',
      agentName: 'Agent / Key Name',
      model: 'LLM Model',
      systemPrompt: 'System Prompt',
      apiKey: 'Linked API Key',
      editBtn: 'Edit Prompt',
      saveBtn: 'Save Changes',
      cancelBtn: 'Cancel',
      promptUpdatedNotice: 'System prompt updated successfully.',
    },
    capabilities: {
      title: 'Server Configuration',
      subtitle: 'Inspect runtime capabilities, AI adapters, and voice pipelines',
      loading: 'Loading server capabilities...',
      serverInfo: 'Server Engine',
      version: 'OwlLayer Core Version',
      activeProvider: 'Active LLM Provider',
      audioCapabilities: 'Audio & Speech Capabilities',
      liveMode: 'Live Bidirectional Audio',
      hybridMode: 'Hybrid Pipeline (STT / TTS)',
      sttProvider: 'Speech-to-Text (STT)',
      ttsProvider: 'Text-to-Speech (TTS)',
      availableModels: 'Supported Models',
      supportsAudio: 'Audio Support',
      supportsTools: 'Tools Support',
      livekitBridge: 'LiveKit WebRTC Bridge',
      bridgeStatus: 'Bridge Status',
      voiceRuntimeConfig: 'Runtime Voice Settings',
      readOnlyNotice: 'This server exposes capabilities in read-only mode.',
      saveVoiceConfig: 'Save Configuration',
    },
    lines: {
      title: 'Virtual Lines',
      subtitle: 'Manage concurrency pools and token allocations',
      loading: 'Loading virtual lines...',
      noLines: 'No virtual lines configured on this server',
      disabled: 'Virtual lines are not enabled on this server.',
      poolName: 'Pool Name',
      maxConcurrency: 'Max Concurrency',
      activeLines: 'Active Lines',
      busyLines: 'Busy Lines',
      queueLength: 'Queue Length',
      allocatedTokens: 'Allocated Tokens',
      available: 'Available',
      busy: 'Busy',
      total: 'Total',
      forceRelease: 'Force release',
      acquireLine: 'Acquire Line',
      releaseLine: 'Release',
      waiting: 'Waiting',
    },
    metrics: {
      title: 'Performance Metrics',
      subtitle: 'Real-time throughput, latency, and resource utilization',
      loading: 'Loading metrics...',
      requestsPerSec: 'Throughput',
      avgLatency: 'Average Latency',
      totalTokenUsage: 'Token Usage',
      errorRate: 'Error Rate',
      hourlyTraffic: 'Activity Over Time',
      tokenConsumption: 'Token Consumption Breakdown',
    },
    common: {
      search: 'Search...',
      filter: 'Filter',
      refresh: 'Refresh',
      active: 'Active',
      inactive: 'Inactive',
      enabled: 'Enabled',
      disabled: 'Disabled',
      unknown: 'Unknown',
      none: 'None',
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      na: 'N/A',
      yes: 'Yes',
      no: 'No',
      language: 'Language',
    },
  },

  fr: {
    nav: {
      status: 'Statut',
      sessions: 'Sessions',
      tools: 'Outils',
      apikeys: 'Clés API',
      agents: 'Agents',
      capabilities: 'Configuration',
      lines: 'Lignes',
      metrics: 'Métriques',
      logout: 'Déconnexion',
    },
    login: {
      title: 'OwlLayer Admin',
      subtitle: 'Connectez-vous à votre espace d\'administration',
      usernamePlaceholder: 'Nom d\'utilisateur',
      passwordPlaceholder: 'Mot de passe',
      submit: 'Se connecter',
      submitting: 'Connexion en cours...',
      defaultError: 'Identifiants invalides ou serveur inaccessible.',
    },
    status: {
      title: 'Statut du serveur',
      errorPrefix: 'Erreur : ',
      loading: 'Chargement du statut...',
      uptime: 'Temps de fonctionnement',
      version: 'Version',
      activeSessions: 'Sessions actives',
      activeConnections: 'Connexions actives',
      serverTools: 'Outils serveur',
      pendingToolCalls: 'Appels d\'outils en attente',
      livekitRooms: 'Salons LiveKit',
      livekitOpsTitle: 'Opérations Bridge LiveKit',
      bridgeActive: 'Bridge actif',
      bridgeInactive: 'Bridge inactif',
      roomName: 'Nom du salon',
      participants: 'Participants',
      emptyRooms: 'Aucun salon LiveKit actif',
      serverToolsTitle: 'Outils serveur enregistrés',
      noServerTools: 'Aucun outil serveur enregistré',
      recentEventsTitle: 'Événements récents',
      noEvents: 'Aucun événement récent enregistré',
    },
    sessions: {
      title: 'Sessions',
      loading: 'Chargement des sessions...',
      noSessions: 'Aucune session trouvée',
      active: 'Active',
      ended: 'Terminée',
      session: 'Session',
      clientIp: 'IP Client',
      startedAt: 'Démarrée le',
      duration: 'Durée',
      messages: 'Messages',
      toolCalls: 'Appels d\'outils',
      audioMode: 'Mode audio',
      actions: 'Actions',
      viewDetails: 'Voir détails',
      filterAll: 'Toutes les sessions',
      filterActive: 'Actives seulement',
    },
    sessionDetail: {
      backToSessions: '← Retour aux sessions',
      title: 'Détails de la session',
      loading: 'Chargement des détails...',
      notFound: 'Session introuvable ou expirée.',
      infoTab: 'Vue générale',
      transcriptTab: 'Transcription',
      toolsTab: 'Appels d\'outils',
      memoryTab: 'Mémoire Agent',
      graphTab: 'Graphe d\'exécution',
      sessionId: 'ID de Session',
      status: 'Statut',
      clientIp: 'IP Client',
      startedAt: 'Démarrée le',
      endedAt: 'Terminée le',
      audioMode: 'Mode audio',
      tokenUsage: 'Consommation tokens',
      inputTokens: 'Tokens entrée',
      outputTokens: 'Tokens sortie',
      totalTokens: 'Tokens total',
      noTranscript: 'Aucun message dans cette transcription de session.',
      noToolCalls: 'Aucun appel d\'outil exécuté dans cette session.',
      noMemory: 'Aucun instantané de mémoire disponible pour cette session.',
      userRole: 'Utilisateur',
      agentRole: 'Assistant',
      systemRole: 'Système',
      toolCallName: 'Nom de l\'outil',
      toolCallStatus: 'Statut',
      toolCallDuration: 'Durée',
    },
    tools: {
      title: 'Outils & Capacités',
      subtitle: 'Explorez les outils agents disponibles côté serveur et client',
      loading: 'Chargement des outils...',
      noTools: 'Aucun outil enregistré pour le moment',
      serverTools: 'Outils Serveur',
      clientTools: 'Outils Client (En direct)',
      name: 'Nom',
      description: 'Description',
      risk: 'Niveau de risque',
      origin: 'Origine',
      parameters: 'Paramètres',
      schema: 'Schéma JSON',
      serverOrigin: 'Côté serveur',
      clientOrigin: 'Côté client',
    },
    apikeys: {
      title: 'Clés d\'API',
      subtitle: 'Gérez les jetons d\'authentification client et les politiques d\'accès',
      loading: 'Chargement des clés...',
      createKeyBtn: '+ Créer une clé',
      createModalTitle: 'Créer une nouvelle clé d\'API',
      keyName: 'Nom / Libellé de la clé',
      keyNamePlaceholder: 'ex: Application Web ShopMate',
      rateLimit: 'Limite de requêtes (req/min)',
      rateLimitPlaceholder: '60',
      allowedOrigins: 'Origines autorisées (séparées par virgules)',
      allowedOriginsPlaceholder: 'http://localhost:3000, https://app.example.com',
      createBtn: 'Générer la clé',
      cancelBtn: 'Annuler',
      nameCol: 'Nom',
      prefixCol: 'Préfixe',
      rateLimitCol: 'Limite',
      originsCol: 'Origines autorisées',
      createdCol: 'Créée le',
      actionsCol: 'Actions',
      revokeBtn: 'Révoquer',
      revokeConfirm: 'Voulez-vous vraiment révoquer cette clé ? Les connexions actives l\'utilisant seront interrompues.',
      noKeys: 'Aucune clé d\'API configurée',
      keyCreatedNotice: 'Clé d\'API créée avec succès ! Copiez-la maintenant ; elle ne sera plus affichée.',
      copyKeyNotice: 'Cliquer pour copier la clé complète',
      closeBtn: 'Fermer',
    },
    agents: {
      title: 'Profils d\'Agents',
      subtitle: 'Personnalisez le comportement des modèles et les prompts système',
      loading: 'Chargement des profils d\'agents...',
      noAgents: 'Aucun profil d\'agent personnalisé configuré',
      agentName: 'Nom de l\'agent / Clé',
      model: 'Modèle LLM',
      systemPrompt: 'Prompt Système',
      apiKey: 'Clé API liée',
      editBtn: 'Modifier le prompt',
      saveBtn: 'Enregistrer',
      cancelBtn: 'Annuler',
      promptUpdatedNotice: 'Prompt système mis à jour avec succès.',
    },
    capabilities: {
      title: 'Configuration du Serveur',
      subtitle: 'Inspectez les capacités d\'exécution, adaptateurs IA et pipelines audio',
      loading: 'Chargement de la configuration...',
      serverInfo: 'Moteur Serveur',
      version: 'Version Core OwlLayer',
      activeProvider: 'Fournisseur LLM Actif',
      audioCapabilities: 'Capacités Vocales & Audio',
      liveMode: 'Audio Bidirectionnel Live',
      hybridMode: 'Pipeline Hybride (STT / TTS)',
      sttProvider: 'Reconnaissance Vocale (STT)',
      ttsProvider: 'Synthèse Vocale (TTS)',
      availableModels: 'Modèles Compatibles',
      supportsAudio: 'Support Audio',
      supportsTools: 'Support Outils',
      livekitBridge: 'Bridge LiveKit WebRTC',
      bridgeStatus: 'Statut du Bridge',
      voiceRuntimeConfig: 'Paramètres Vocaux en Direct',
      readOnlyNotice: 'Ce serveur expose ses capacités en lecture seule.',
      saveVoiceConfig: 'Enregistrer la configuration',
    },
    lines: {
      title: 'Lignes Virtuelles',
      subtitle: 'Gérez les pools de concurrence et les allocations de jetons',
      loading: 'Chargement des lignes virtuelles...',
      noLines: 'Aucune ligne virtuelle configurée sur ce serveur',
      disabled: 'Les lignes virtuelles ne sont pas activées sur ce serveur.',
      poolName: 'Nom du pool',
      maxConcurrency: 'Concurrence max',
      activeLines: 'Lignes actives',
      busyLines: 'Lignes occupées',
      queueLength: 'File d\'attente',
      allocatedTokens: 'Tokens alloués',
      available: 'Disponibles',
      busy: 'Occupées',
      total: 'Total',
      forceRelease: 'Forcer la libération',
      acquireLine: 'Acquérir une ligne',
      releaseLine: 'Libérer',
      waiting: 'En attente',
    },
    metrics: {
      title: 'Métriques de Performance',
      subtitle: 'Débit en temps réel, latence et utilisation des ressources',
      loading: 'Chargement des métriques...',
      requestsPerSec: 'Débit',
      avgLatency: 'Latence moyenne',
      totalTokenUsage: 'Tokens consommés',
      errorRate: 'Taux d\'erreur',
      hourlyTraffic: 'Activité dans le temps',
      tokenConsumption: 'Répartition de la consommation de tokens',
    },
    common: {
      search: 'Rechercher...',
      filter: 'Filtrer',
      refresh: 'Actualiser',
      active: 'Actif',
      inactive: 'Inactif',
      enabled: 'Activé',
      disabled: 'Désactivé',
      unknown: 'Inconnu',
      none: 'Aucun',
      success: 'Succès',
      error: 'Erreur',
      warning: 'Avertissement',
      na: 'N/D',
      yes: 'Oui',
      no: 'Non',
      language: 'Langue',
    },
  },
};

let currentLanguage: DashboardLanguage = 'en';
const listeners = new Set<(lang: DashboardLanguage) => void>();

export function getDashboardLanguage(): DashboardLanguage {
  return currentLanguage;
}

export function setDashboardLanguage(lang: DashboardLanguage): void {
  currentLanguage = lang === 'fr' ? 'fr' : 'en';
  listeners.forEach((l) => l(currentLanguage));
}

export function subscribeDashboardLanguage(callback: (lang: DashboardLanguage) => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function t(): DashboardTranslations {
  return translations[currentLanguage];
}
