# DomOS Flutter SDK - Architecture Complète

> Package `domos_flutter` - Port complet du SDK TypeScript/React vers Flutter

---

## 📊 Analyse Complète de l'Écosystème Existant

### Structure Actuelle

```
@domos/core (framework-agnostic)
├── DomOSClient
├── Protocol ADTP
├── ToolRegistry
├── Shadow Context
├── HITL Security
└── Utils (logger, uuid)

@domos/react (React bindings)
├── DomOSProvider (Context Provider)
├── Hooks:
│   ├── useAgent
│   ├── useAgentTool
│   ├── useAgentContext
│   ├── useNavigationTool
│   ├── useViewStateTool
│   ├── useVoiceMode
│   └── useApproval
└── Components:
    ├── DomOSWidget (chat complet)
    ├── ApprovalBanner
    ├── ApprovalModal
    ├── AgentIndicator
    ├── Notification
    └── ShadowContainer
```

---

## 🎯 Mapping Complet TypeScript → Flutter

### 1. Core Layer

| TypeScript/React | Flutter | Package Dart |
|------------------|---------|--------------|
| `DomOSClient` | `DomOSClient` | core |
| `WebSocket` | `web_socket_channel` | web_socket_channel |
| `ADTP Protocol` | `ADTPProtocol` | core |
| `ToolRegistry` | `ToolRegistry` | core |
| `ShadowContext` | `ShadowContext` | core |
| `HITLPolicy` | `HITLPolicy` | core |

### 2. React → Flutter Bindings

| React | Flutter | Pattern |
|-------|---------|---------|
| `DomOSProvider` | `DomOSProvider` | InheritedWidget |
| `useAgent()` | `UseAgentMixin` | Mixin |
| `useAgentTool()` | `UseAgentToolMixin` | Mixin + lifecycle |
| `useAgentContext()` | `UseAgentContextMixin` | Mixin |
| `useVoiceMode()` | `UseVoiceModeMixin` | Mixin + flutter_sound |
| `useApproval()` | `UseApprovalMixin` | Mixin |
| Components | Widgets | StatelessWidget/StatefulWidget |

### 3. Hooks → Mixins (Lifecycle-aware)

**React Hooks** (pas de lifecycle) → **Flutter Mixins** (lifecycle intégré)

```dart
// React Hook
useAgentTool({ name, handler }, [deps]);

// Flutter Mixin
class MyWidget extends StatefulWidget with UseAgentTool {
  @override
  void initState() {
    super.initState();
    registerTool(/* ... */);
  }
  
  @override
  void dispose() {
    unregisterTool();  // Auto cleanup!
    super.dispose();
  }
}
```

---

## 📦 Architecture Flutter Complète

### Structure du Package

```
domos_flutter/
├── pubspec.yaml
├── lib/
│   ├── domos_flutter.dart                # Export principal
│   │
│   ├── src/
│   │   ├── core/                         # Port de @domos/core
│   │   │   ├── client/
│   │   │   │   ├── domos_client.dart
│   │   │   │   ├── client_state.dart
│   │   │   │   └── client_options.dart
│   │   │   │
│   │   │   ├── protocol/                 # ADTP Protocol
│   │   │   │   ├── adtp_types.dart
│   │   │   │   ├── adtp_messages.dart
│   │   │   │   ├── adtp_encoder.dart
│   │   │   │   ├── adtp_decoder.dart
│   │   │   │   ├── adtp_validator.dart
│   │   │   │   └── adtp_constants.dart
│   │   │   │
│   │   │   ├── tools/
│   │   │   │   ├── tool_registry.dart
│   │   │   │   ├── tool_types.dart
│   │   │   │   ├── tool_schema.dart      # Zod-like validation
│   │   │   │   └── tool_declaration.dart
│   │   │   │
│   │   │   ├── context/
│   │   │   │   ├── shadow_context.dart
│   │   │   │   ├── context_differ.dart
│   │   │   │   └── context_types.dart
│   │   │   │
│   │   │   ├── security/
│   │   │   │   ├── hitl_policy.dart
│   │   │   │   ├── hitl_types.dart
│   │   │   │   └── approval_manager.dart
│   │   │   │
│   │   │   ├── transport/
│   │   │   │   ├── transport.dart
│   │   │   │   ├── websocket_transport.dart
│   │   │   │   └── webrtc_transport.dart  # Optionnel
│   │   │   │
│   │   │   └── utils/
│   │   │       ├── logger.dart
│   │   │       └── uuid.dart
│   │   │
│   │   └── flutter/                      # Port de @domos/react
│   │       ├── provider/
│   │       │   ├── domos_provider.dart
│   │       │   └── domos_inherited.dart
│   │       │
│   │       ├── mixins/                   # Hooks → Mixins
│   │       │   ├── use_agent.dart
│   │       │   ├── use_agent_tool.dart
│   │       │   ├── use_agent_context.dart
│   │       │   ├── use_navigation_tool.dart
│   │       │   ├── use_view_state_tool.dart
│   │       │   ├── use_voice_mode.dart
│   │       │   └── use_approval.dart
│   │       │
│   │       ├── widgets/
│   │       │   ├── chat/
│   │       │   │   ├── domos_widget.dart
│   │       │   │   ├── message_list.dart
│   │       │   │   ├── chat_input.dart
│   │       │   │   ├── floating_button.dart
│   │       │   │   └── audio_orb.dart
│   │       │   │
│   │       │   ├── approvals/
│   │       │   │   ├── approval_banner.dart
│   │       │   │   └── approval_modal.dart
│   │       │   │
│   │       │   ├── indicators/
│   │       │   │   ├── agent_indicator.dart
│   │       │   │   └── notification.dart
│   │       │   │
│   │       │   └── shadow/
│   │       │       └── shadow_container.dart
│   │       │
│   │       └── audio/
│   │           ├── audio_recorder.dart
│   │           ├── audio_player.dart
│   │           └── audio_encoder.dart   # PCM/WAV
│   │
│   └── models/                           # Data classes
│       ├── message.dart
│       ├── tool_call.dart
│       └── approval_request.dart
│
├── example/
│   ├── lib/
│   │   ├── main.dart
│   │   ├── screens/
│   │   │   ├── chat_screen.dart
│   │   │   └── product_screen.dart
│   │   └── tools/
│   │       ├── product_tools.dart
│   │       └── navigation_tools.dart
│   └── pubspec.yaml
│
└── test/
    ├── core/
    │   ├── client_test.dart
    │   ├── protocol_test.dart
    │   └── tool_registry_test.dart
    ├── flutter/
    │   ├── provider_test.dart
    │   └── widgets_test.dart
    └── integration/
        └── e2e_test.dart
```

---

## 💻 Implémentation Détaillée

### 1. Core - DomOSClient

```dart
// lib/src/core/client/domos_client.dart

import 'dart:async';
import '../protocol/adtp_types.dart';
import '../protocol/adtp_messages.dart';
import '../protocol/adtp_encoder.dart';
import '../protocol/adtp_decoder.dart';
import '../tools/tool_registry.dart';
import '../context/shadow_context.dart';
import '../security/hitl_policy.dart';
import '../transport/websocket_transport.dart';
import 'client_state.dart';
import 'client_options.dart';

/// DomOSClient - Core client compatible avec serveur DomOS
class DomOSClient {
  final DomOSClientOptions options;
  
  // Transport
  WebSocketTransport? _transport;
  
  // State
  ClientState _state = ClientState.disconnected;
  String? _sessionId;
  
  // Registries
  final ToolRegistry _toolRegistry = ToolRegistry();
  final ShadowContext _shadowContext = ShadowContext();
  final HITLPolicy _hitlPolicy = HITLPolicy();
  
  // Reconnection
  Timer? _reconnectTimer;
  int _reconnectAttempts = 0;
  
  // Stream Controllers pour reactive updates
  final _stateController = StreamController<ClientState>.broadcast();
  final _sessionController = StreamController<String>.broadcast();
  final _agentResponseController = StreamController<AgentResponse>.broadcast();
  final _toolCallController = StreamController<ToolCall>.broadcast();
  final _systemEventController = StreamController<SystemEvent>.broadcast();
  final _audioOutputController = StreamController<AudioOutput>.broadcast();
  final _errorController = StreamController<DomOSError>.broadcast();
  final _toolsSyncController = StreamController<List<ToolDeclaration>>.broadcast();
  final _approvalRequestController = StreamController<ApprovalRequest>.broadcast();
  
  // Getters
  ClientState get state => _state;
  String? get sessionId => _sessionId;
  bool get isConnected => _state == ClientState.connected || _state == ClientState.listening;
  List<ToolDeclaration> get registeredTools => _toolRegistry.getDeclarations();
  int get toolCount => _toolRegistry.count;
  
  // Streams (reactive)
  Stream<ClientState> get stateStream => _stateController.stream;
  Stream<String> get sessionStream => _sessionController.stream;
  Stream<AgentResponse> get agentResponseStream => _agentResponseController.stream;
  Stream<ToolCall> get toolCallStream => _toolCallController.stream;
  Stream<SystemEvent> get systemEventStream => _systemEventController.stream;
  Stream<AudioOutput> get audioOutputStream => _audioOutputController.stream;
  Stream<DomOSError> get errorStream => _errorController.stream;
  Stream<List<ToolDeclaration>> get toolsSyncStream => _toolsSyncController.stream;
  Stream<ApprovalRequest> get approvalRequestStream => _approvalRequestController.stream;
  
  DomOSClient(this.options);
  
  /// Connecter au serveur
  Future<void> connect() async {
    if (_transport != null) {
      await disconnect();
    }
    
    _setState(ClientState.connecting);
    
    try {
      _transport = WebSocketTransport(
        endpoint: options.endpoint,
        apiKey: options.apiKey,
        onMessage: _handleMessage,
        onError: _handleError,
        onClose: _handleClose,
      );
      
      await _transport!.connect();
      
      // Envoyer HANDSHAKE_INIT
      _send(ADTPMessages.handshakeInit(
        options.apiKey,
        'DomOSFlutter',
        '1.0.0',
        '1.0.0',
        '1.0.0',
      ));
      
    } catch (e) {
      _setState(ClientState.error);
      _errorController.add(DomOSError('Connection failed: $e'));
    }
  }
  
  /// Déconnecter
  Future<void> disconnect() async {
    _reconnectTimer?.cancel();
    await _transport?.disconnect();
    _transport = null;
    _setState(ClientState.disconnected);
  }
  
  /// Enregistrer un tool
  void registerTool({
    required ToolDeclaration declaration,
    required Future<dynamic> Function(Map<String, dynamic>) handler,
    String? componentId,
  }) {
    _toolRegistry.register(
      RegisteredTool(
        declaration: declaration,
        handler: handler,
        componentId: componentId,
      ),
    );
    
    if (isConnected) {
      _syncTools();
    }
  }
  
  /// Désinscrire un tool
  void unregisterTool(String name) {
    _toolRegistry.unregister(name);
    if (isConnected) {
      _syncTools();
    }
  }
  
  /// Mettre à jour le Shadow Context
  void updateContext(Map<String, dynamic> data) {
    _shadowContext.update(data);
    
    if (isConnected) {
      _send(ADTPMessages.contextUpdate(_shadowContext.toMap()));
    }
  }
  
  /// Envoyer texte
  void sendText(String text) {
    if (!isConnected) {
      throw StateError('Client not connected');
    }
    
    _send(ADTPMessages.userInput(text, 'text'));
    _setState(ClientState.thinking);
  }
  
  /// Envoyer audio
  void sendAudio(String audioBase64, String mimeType) {
    if (!isConnected) {
      throw StateError('Client not connected');
    }
    
    _send(ADTPMessages.userInput(audioBase64, 'audio', mimeType: mimeType));
    _setState(ClientState.thinking);
  }
  
  /// Envoyer audio stream (mode Live)
  void sendAudioStream(String audioBase64, String mimeType) {
    if (!isConnected) {
      throw StateError('Client not connected');
    }
    
    // En mode live, on envoie via un message différent
    _send(ADTPMessages.audioStream(audioBase64, mimeType));
  }
  
  /// Sync tools avec serveur
  void syncToolsWithServer() {
    if (isConnected) {
      _syncTools();
    }
  }
  
  // ============================================================
  // Message Handling
  // ============================================================
  
  void _handleMessage(ADTPMessage message) {
    switch (message.type) {
      case MessageType.handshakeAck:
        _handleHandshakeAck(message);
        break;
      
      case MessageType.agentResponse:
        _handleAgentResponse(message);
        break;
      
      case MessageType.toolCall:
        _handleToolCall(message);
        break;
      
      case MessageType.audioStream:
        _handleAudioStream(message);
        break;
      
      case MessageType.systemEvent:
        _handleSystemEvent(message);
        break;
      
      case MessageType.approvalRequest:
        _handleApprovalRequest(message);
        break;
      
      default:
        print('[DomOS] Unknown message type: ${message.type}');
    }
  }
  
  void _handleHandshakeAck(ADTPMessage message) {
    final payload = message.payload as Map<String, dynamic>;
    _sessionId = payload['sessionId'] as String;
    _sessionController.add(_sessionId!);
    
    _setState(ClientState.connected);
    
    // Sync tools après connexion
    _syncTools();
    
    // Envoyer context initial
    if (_shadowContext.isNotEmpty) {
      _send(ADTPMessages.contextUpdate(_shadowContext.toMap()));
    }
  }
  
  void _handleAgentResponse(ADTPMessage message) {
    final payload = message.payload as Map<String, dynamic>;
    final text = payload['text'] as String;
    final done = payload['done'] as bool;
    
    _agentResponseController.add(AgentResponse(text: text, done: done));
    
    if (done) {
      _setState(ClientState.listening);
    } else {
      _setState(ClientState.speaking);
    }
  }
  
  Future<void> _handleToolCall(ADTPMessage message) async {
    final payload = message.payload as Map<String, dynamic>;
    final callId = payload['callId'] as String;
    final name = payload['name'] as String;
    final args = payload['args'] as Map<String, dynamic>;
    
    final toolCall = ToolCall(callId: callId, name: name, args: args);
    _toolCallController.add(toolCall);
    
    // Vérifier HITL
    final tool = _toolRegistry.get(name);
    if (tool == null) {
      _send(ADTPMessages.toolResult(
        callId,
        'error',
        error: 'Tool not found: $name',
      ));
      return;
    }
    
    // Vérifier si approval requis
    final action = _hitlPolicy.evaluateTool(tool.declaration);
    if (action == SecurityAction.requireApproval) {
      // Demander approbation
      final request = ApprovalRequest(
        callId: callId,
        toolName: name,
        args: args,
        risk: tool.declaration.risk,
        message: 'Approve "${name}" action?',
      );
      
      _approvalRequestController.add(request);
      return; // Ne pas exécuter maintenant
    }
    
    // Exécuter le tool
    try {
      final result = await tool.handler(args);
      _send(ADTPMessages.toolResult(callId, 'success', result: result));
    } catch (e) {
      _send(ADTPMessages.toolResult(callId, 'error', error: e.toString()));
    }
  }
  
  void _handleAudioStream(ADTPMessage message) {
    final payload = message.payload as Map<String, dynamic>;
    _audioOutputController.add(AudioOutput(
      audioBase64: payload['data'] as String,
      mimeType: payload['mimeType'] as String,
    ));
  }
  
  void _handleSystemEvent(ADTPMessage message) {
    final payload = message.payload as Map<String, dynamic>;
    _systemEventController.add(SystemEvent(
      kind: payload['kind'] as String,
      message: payload['message'] as String?,
    ));
  }
  
  void _handleApprovalRequest(ADTPMessage message) {
    // Approval du serveur (server-side tool)
    final payload = message.payload as Map<String, dynamic>;
    final request = ApprovalRequest.fromMap(payload);
    _approvalRequestController.add(request);
  }
  
  void _handleError(dynamic error) {
    _errorController.add(DomOSError(error.toString()));
    _setState(ClientState.error);
  }
  
  void _handleClose() {
    _setState(ClientState.disconnected);
    
    // Auto-reconnect
    if (options.autoReconnect && 
        _reconnectAttempts < options.maxReconnectAttempts) {
      _scheduleReconnect();
    }
  }
  
  void _scheduleReconnect() {
    _reconnectAttempts++;
    _reconnectTimer = Timer(
      Duration(milliseconds: options.reconnectDelay),
      () => connect(),
    );
  }
  
  void _syncTools() {
    final tools = _toolRegistry.getDeclarations();
    _toolsSyncController.add(tools);
    
    // Envoyer au serveur via context update
    _send(ADTPMessages.contextUpdate({
      '_tools': tools.map((t) => t.toJson()).toList(),
    }));
  }
  
  void _setState(ClientState newState) {
    if (_state != newState) {
      _state = newState;
      _stateController.add(newState);
    }
  }
  
  void _send(ADTPMessage message) {
    _transport?.send(ADTPEncoder.encode(message));
  }
  
  /// Approuver un tool en attente
  void approveToolCall(String callId) async {
    _send(ADTPMessages.approvalResponse(callId, true));
    
    // Exécuter le tool maintenant
    // (logique similaire à _handleToolCall)
  }
  
  /// Refuser un tool
  void denyToolCall(String callId) {
    _send(ADTPMessages.approvalResponse(callId, false));
  }
  
  /// Dispose
  void dispose() {
    _reconnectTimer?.cancel();
    disconnect();
    _stateController.close();
    _sessionController.close();
    _agentResponseController.close();
    _toolCallController.close();
    _systemEventController.close();
    _audioOutputController.close();
    _errorController.close();
    _toolsSyncController.close();
    _approvalRequestController.close();
  }
}

// ============================================================
// Data Classes
// ============================================================

class AgentResponse {
  final String text;
  final bool done;
  
  AgentResponse({required this.text, required this.done});
}

class ToolCall {
  final String callId;
  final String name;
  final Map<String, dynamic> args;
  
  ToolCall({required this.callId, required this.name, required this.args});
}

class AudioOutput {
  final String audioBase64;
  final String mimeType;
  
  AudioOutput({required this.audioBase64, required this.mimeType});
}

class SystemEvent {
  final String kind;
  final String? message;
  
  SystemEvent({required this.kind, this.message});
}

class DomOSError {
  final String message;
  
  DomOSError(this.message);
}

class RegisteredTool {
  final ToolDeclaration declaration;
  final Future<dynamic> Function(Map<String, dynamic>) handler;
  final String? componentId;
  
  RegisteredTool({
    required this.declaration,
    required this.handler,
    this.componentId,
  });
}

enum ClientState {
  disconnected,
  connecting,
  connected,
  listening,
  thinking,
  speaking,
  error,
}
```

---

### 2. Flutter - Provider (InheritedWidget)

```dart
// lib/src/flutter/provider/domos_provider.dart

import 'package:flutter/widgets.dart';
import '../../core/client/domos_client.dart';
import '../../core/client/client_options.dart';
import '../../core/client/client_state.dart';
import '../../core/tools/tool_types.dart';
import 'domos_inherited.dart';

/// DomOSProvider - Provider principal pour partager DomOSClient
/// 
/// Équivalent de DomOSProvider React
class DomOSProvider extends StatefulWidget {
  final String apiKey;
  final String endpoint;
  final bool autoConnect;
  final bool debug;
  final bool virtualLines;
  final Widget child;
  
  const DomOSProvider({
    Key? key,
    required this.apiKey,
    required this.endpoint,
    this.autoConnect = true,
    this.debug = false,
    this.virtualLines = false,
    required this.child,
  }) : super(key: key);
  
  /// Accéder au client depuis n'importe où
  static DomOSClient of(BuildContext context) {
    final inherited = context.dependOnInheritedWidgetOfExactType<DomOSInherited>();
    assert(inherited != null, 'No DomOSProvider found in context');
    return inherited!.client;
  }
  
  static DomOSClient? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<DomOSInherited>()?.client;
  }
  
  @override
  State<DomOSProvider> createState() => _DomOSProviderState();
}

class _DomOSProviderState extends State<DomOSProvider> {
  late DomOSClient _client;
  ClientState _state = ClientState.disconnected;
  String? _sessionId;
  
  @override
  void initState() {
    super.initState();
    
    _client = DomOSClient(
      DomOSClientOptions(
        endpoint: widget.endpoint,
        apiKey: widget.apiKey,
        debug: widget.debug,
        autoReconnect: true,
        virtualLines: widget.virtualLines,
      ),
    );
    
    // Listen state changes
    _client.stateStream.listen((state) {
      setState(() {
        _state = state;
      });
    });
    
    _client.sessionStream.listen((sessionId) {
      setState(() {
        _sessionId = sessionId;
      });
    });
    
    // Auto-connect
    if (widget.autoConnect) {
      _client.connect();
    }
  }
  
  @override
  void dispose() {
    _client.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    return DomOSInherited(
      client: _client,
      state: _state,
      sessionId: _sessionId,
      child: widget.child,
    );
  }
}
```

```dart
// lib/src/flutter/provider/domos_inherited.dart

import 'package:flutter/widgets.dart';
import '../../core/client/domos_client.dart';
import '../../core/client/client_state.dart';

/// InheritedWidget pour propager le client
class DomOSInherited extends InheritedWidget {
  final DomOSClient client;
  final ClientState state;
  final String? sessionId;
  
  const DomOSInherited({
    Key? key,
    required this.client,
    required this.state,
    required this.sessionId,
    required Widget child,
  }) : super(key: key, child: child);
  
  @override
  bool updateShouldNotify(DomOSInherited oldWidget) {
    return client != oldWidget.client || 
           state != oldWidget.state ||
           sessionId != oldWidget.sessionId;
  }
}
```

---

### 3. Flutter - Mixins (Hooks → Mixins)

#### UseAgentMixin

```dart
// lib/src/flutter/mixins/use_agent.dart

import 'package:flutter/widgets.dart';
import '../../core/client/domos_client.dart';
import '../provider/domos_provider.dart';

/// Mixin UseAgent - Accès au client DomOS
/// 
/// Équivalent de useAgent() React hook
mixin UseAgentMixin<T extends StatefulWidget> on State<T> {
  DomOSClient get agent => DomOSProvider.of(context);
  
  /// Envoyer du texte
  void sendText(String text) => agent.sendText(text);
  
  /// Envoyer audio
  void sendAudio(String audioBase64, String mimeType) {
    agent.sendAudio(audioBase64, mimeType);
  }
  
  /// State actuel
  ClientState get agentState => agent.state;
  
  /// Session ID
  String? get sessionId => agent.sessionId;
  
  /// Connecté ?
  bool get isConnected => agent.isConnected;
}
```

#### UseAgentToolMixin

```dart
// lib/src/flutter/mixins/use_agent_tool.dart

import 'package:flutter/widgets.dart';
import '../../core/client/domos_client.dart';
import '../../core/tools/tool_types.dart';
import '../provider/domos_provider.dart';

/// Mixin UseAgentTool - Enregistrer un tool avec lifecycle automatique
/// 
/// Équivalent de useAgentTool() React hook
/// Le tool est enregistré dans initState() et désenregistré dans dispose()
mixin UseAgentToolMixin<T extends StatefulWidget> on State<T> {
  DomOSClient get _client => DomOSProvider.of(context);
  
  String? _toolName;
  
  /// Enregistrer un tool (à appeler dans initState)
  void registerAgentTool({
    required String name,
    required String description,
    required Future<dynamic> Function(Map<String, dynamic>) handler,
    Map<String, ToolParameter>? parameters,
    RiskLevel risk = RiskLevel.none,
  }) {
    _toolName = name;
    
    final declaration = ToolDeclaration(
      name: name,
      description: description,
      parameters: parameters,
      risk: risk,
    );
    
    _client.registerTool(
      declaration: declaration,
      handler: handler,
      componentId: hashCode.toString(),
    );
  }
  
  @override
  void dispose() {
    if (_toolName != null) {
      _client.unregisterTool(_toolName!);
    }
    super.dispose();
  }
}
```

**Utilisation** :

```dart
class ProductCard extends StatefulWidget {
  final Product product;
  
  const ProductCard({required this.product});
  
  @override
  State<ProductCard> createState() => _ProductCardState();
}

class _ProductCardState extends State<ProductCard> 
    with UseAgentToolMixin {
  bool _isLiked = false;
  
  @override
  void initState() {
    super.initState();
    
    // Auto-register tool
    registerAgentTool(
      name: 'like_product',
      description: 'Add ${widget.product.name} to favorites',
      handler: (args) async {
        final shouldLike = args['shouldLike'] as bool;
        setState(() {
          _isLiked = shouldLike;
        });
        await api.like(widget.product.id, shouldLike);
        return shouldLike ? 'Added to favorites' : 'Removed';
      },
      parameters: {
        'shouldLike': ToolParameter(
          type: 'boolean',
          description: 'True to like, false to unlike',
        ),
      },
    );
  }
  
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        children: [
          Text(widget.product.name),
          Icon(_isLiked ? Icons.favorite : Icons.favorite_border),
        ],
      ),
    );
  }
  // dispose() appelé automatiquement → tool désenregistré
}
```

#### UseAgentContextMixin

```dart
// lib/src/flutter/mixins/use_agent_context.dart

import 'package:flutter/widgets.dart';
import '../../core/client/domos_client.dart';
import '../provider/domos_provider.dart';

/// Mixin UseAgentContext - Injecter du contexte passif
/// 
/// Équivalent de useAgentContext() React hook
mixin UseAgentContextMixin<T extends StatefulWidget> on State<T> {
  DomOSClient get _client => DomOSProvider.of(context);
  
  /// Mettre à jour le context
  void updateAgentContext(Map<String, dynamic> data) {
    _client.updateContext(data);
  }
}
```

**Utilisation** :

```dart
class UserProfile extends StatefulWidget {
  final User user;
  
  const UserProfile({required this.user});
  
  @override
  State<UserProfile> createState() => _UserProfileState();
}

class _UserProfileState extends State<UserProfile> 
    with UseAgentContextMixin {
  
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    
    // Inject context
    updateAgentContext({
      'userId': widget.user.id,
      'userName': widget.user.name,
      'userRole': widget.user.role,
      'cartItems': widget.user.cart.length,
    });
  }
  
  @override
  Widget build(BuildContext context) {
    return Text('Welcome ${widget.user.name}');
  }
}
```

#### UseVoiceModeMixin

```dart
// lib/src/flutter/mixins/use_voice_mode.dart

import 'package:flutter/widgets.dart';
import 'package:flutter_sound/flutter_sound.dart';
import '../../core/client/domos_client.dart';
import '../provider/domos_provider.dart';

/// Mixin UseVoiceMode - Micro streaming
/// 
/// Équivalent de useVoiceMode() React hook
mixin UseVoiceModeMixin<T extends StatefulWidget> on State<T> {
  DomOSClient get _client => DomOSProvider.of(context);
  
  FlutterSoundRecorder? _recorder;
  FlutterSoundPlayer? _player;
  bool _isRecording = false;
  bool _live = false;
  
  bool get isRecording => _isRecording;
  
  /// Démarrer l'enregistrement
  Future<void> startRecording({bool live = false}) async {
    _live = live;
    _recorder = FlutterSoundRecorder();
    await _recorder!.openRecorder();
    
    await _recorder!.startRecorder(
      toStream: _audioStreamSink,
      codec: Codec.pcm16,
      numChannels: 1,
      sampleRate: 16000,
    );
    
    setState(() {
      _isRecording = true;
    });
  }
  
  /// Arrêter l'enregistrement
  Future<void> stopRecording() async {
    await _recorder?.stopRecorder();
    await _recorder?.closeRecorder();
    _recorder = null;
    
    setState(() {
      _isRecording = false;
    });
  }
  
  /// Sink pour recevoir l'audio du micro
  StreamSink<Food> get _audioStreamSink {
    return StreamSink<Food>(
      onData: (food) {
        // Convertir PCM → base64
        final bytes = food.data;
        final base64 = base64Encode(bytes!);
        
        // Envoyer au serveur
        if (_live) {
          _client.sendAudioStream(base64, 'audio/pcm;rate=16000');
        } else {
          _client.sendAudio(base64, 'audio/pcm;rate=16000');
        }
      },
    );
  }
  
  /// Jouer l'audio reçu de l'agent
  Future<void> playAudioOutput(String audioBase64, String mimeType) async {
    _player ??= FlutterSoundPlayer();
    await _player!.openPlayer();
    
    // Decoder base64
    final bytes = base64Decode(audioBase64);
    
    // Jouer
    await _player!.startPlayer(
      fromDataBuffer: bytes,
      codec: Codec.pcm16,
      sampleRate: 24000,
    );
  }
  
  @override
  void dispose() {
    _recorder?.closeRecorder();
    _player?.closePlayer();
    super.dispose();
  }
}
```

**Utilisation** :

```dart
class VoiceButton extends StatefulWidget {
  @override
  State<VoiceButton> createState() => _VoiceButtonState();
}

class _VoiceButtonState extends State<VoiceButton> 
    with UseVoiceModeMixin {
  
  @override
  void initState() {
    super.initState();
    
    // Listen audio output (mode live)
    _client.audioOutputStream.listen((output) {
      playAudioOutput(output.audioBase64, output.mimeType);
    });
  }
  
  @override
  Widget build(BuildContext context) {
    return FloatingActionButton(
      onPressed: isRecording ? stopRecording : () => startRecording(live: true),
      child: Icon(isRecording ? Icons.stop : Icons.mic),
    );
  }
}
```

#### UseApprovalMixin

```dart
// lib/src/flutter/mixins/use_approval.dart

import 'package:flutter/widgets.dart';
import '../../core/client/domos_client.dart';
import '../../core/security/hitl_types.dart';
import '../provider/domos_provider.dart';

/// Mixin UseApproval - Gérer les approbations HITL
/// 
/// Équivalent de useApproval() React hook
mixin UseApprovalMixin<T extends StatefulWidget> on State<T> {
  DomOSClient get _client => DomOSProvider.of(context);
  
  /// Stream des demandes d'approbation
  Stream<ApprovalRequest> get approvalRequests => _client.approvalRequestStream;
  
  /// Approuver un tool
  void approve(String callId) {
    _client.approveToolCall(callId);
  }
  
  /// Refuser un tool
  void deny(String callId) {
    _client.denyToolCall(callId);
  }
}
```

---

### 4. Flutter - Widgets

#### DomOSWidget (Chat complet)

```dart
// lib/src/flutter/widgets/chat/domos_widget.dart

import 'package:flutter/material.dart';
import '../../provider/domos_provider.dart';
import '../../mixins/use_agent.dart';

/// DomOSWidget - Widget chat complet
/// 
/// Équivalent de <DomOSWidget /> React
class DomOSWidget extends StatefulWidget {
  final String? title;
  final Color? primaryColor;
  final bool floating;
  
  const DomOSWidget({
    Key? key,
    this.title,
    this.primaryColor,
    this.floating = true,
  }) : super(key: key);
  
  @override
  State<DomOSWidget> createState() => _DomOSWidgetState();
}

class _DomOSWidgetState extends State<DomOSWidget> with UseAgentMixin {
  final _messages = <ChatMessage>[];
  final _controller = TextEditingController();
  bool _isOpen = false;
  
  @override
  void initState() {
    super.initState();
    
    // Listen agent responses
    agent.agentResponseStream.listen((response) {
      if (response.done) {
        setState(() {
          _messages.add(ChatMessage(
            text: response.text,
            isUser: false,
            timestamp: DateTime.now(),
          ));
        });
      }
    });
  }
  
  void _sendMessage() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    
    setState(() {
      _messages.add(ChatMessage(
        text: text,
        isUser: true,
        timestamp: DateTime.now(),
      ));
    });
    
    sendText(text);
    _controller.clear();
  }
  
  @override
  Widget build(BuildContext context) {
    if (widget.floating) {
      return _buildFloating();
    }
    return _buildInline();
  }
  
  Widget _buildFloating() {
    return Stack(
      children: [
        if (_isOpen)
          Positioned(
            bottom: 80,
            right: 16,
            child: _buildChatWindow(),
          ),
        Positioned(
          bottom: 16,
          right: 16,
          child: FloatingActionButton(
            onPressed: () => setState(() => _isOpen = !_isOpen),
            child: Icon(_isOpen ? Icons.close : Icons.chat),
          ),
        ),
      ],
    );
  }
  
  Widget _buildInline() {
    return _buildChatWindow();
  }
  
  Widget _buildChatWindow() {
    return Container(
      width: 350,
      height: 500,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: widget.primaryColor ?? Colors.blue,
              borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
            ),
            child: Row(
              children: [
                Text(
                  widget.title ?? 'AI Assistant',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Spacer(),
                _buildStateIndicator(),
              ],
            ),
          ),
          
          // Messages
          Expanded(
            child: ListView.builder(
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                return MessageBubble(message: _messages[index]);
              },
            ),
          ),
          
          // Input
          Container(
            padding: EdgeInsets.all(8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                SizedBox(width: 8),
                IconButton(
                  icon: Icon(Icons.send),
                  onPressed: _sendMessage,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildStateIndicator() {
    return Container(
      width: 12,
      height: 12,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: _getStateColor(),
      ),
    );
  }
  
  Color _getStateColor() {
    switch (agentState) {
      case ClientState.connected:
      case ClientState.listening:
        return Colors.green;
      case ClientState.thinking:
      case ClientState.speaking:
        return Colors.blue;
      case ClientState.error:
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}

class ChatMessage {
  final String text;
  final bool isUser;
  final DateTime timestamp;
  
  ChatMessage({
    required this.text,
    required this.isUser,
    required this.timestamp,
  });
}

class MessageBubble extends StatelessWidget {
  final ChatMessage message;
  
  const MessageBubble({required this.message});
  
  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: message.isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: EdgeInsets.all(8),
        padding: EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: message.isUser ? Colors.blue : Colors.grey[300],
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          message.text,
          style: TextStyle(
            color: message.isUser ? Colors.white : Colors.black,
          ),
        ),
      ),
    );
  }
}
```

---

## 📋 pubspec.yaml

```yaml
name: domos_flutter
description: DomOS Flutter SDK - AI Agent Framework with Self-Driving capabilities
version: 0.1.0
homepage: https://github.com/your-org/domos
repository: https://github.com/your-org/domos-flutter

environment:
  sdk: '>=3.0.0 <4.0.0'
  flutter: '>=3.10.0'

dependencies:
  flutter:
    sdk: flutter
  
  # WebSocket
  web_socket_channel: ^3.0.0
  
  # HTTP (Virtual Lines)
  http: ^1.2.0
  
  # JSON
  json_annotation: ^4.9.0
  
  # Audio
  flutter_sound: ^9.4.0
  permission_handler: ^11.3.0
  
  # Logging
  logger: ^2.1.0
  
  # UUID
  uuid: ^4.3.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.1
  build_runner: ^2.4.8
  json_serializable: ^6.7.1
  mockito: ^5.4.4
```

---

## 🎯 Example App

```dart
// example/lib/main.dart

import 'package:flutter/material.dart';
import 'package:domos_flutter/domos_flutter.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DomOS Flutter Demo',
      home: DomOSProvider(
        apiKey: 'pk_demo_local',
        endpoint: 'ws://localhost:3000/domos',
        autoConnect: true,
        child: HomeScreen(),
      ),
    );
  }
}

class HomeScreen extends StatefulWidget {
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> 
    with UseAgentMixin, UseAgentToolMixin, UseAgentContextMixin {
  
  int _counter = 0;
  
  @override
  void initState() {
    super.initState();
    
    // Register tool
    registerAgentTool(
      name: 'increment_counter',
      description: 'Increment the counter',
      handler: (args) async {
        setState(() {
          _counter++;
        });
        return 'Counter is now $_counter';
      },
    );
    
    // Inject context
    updateAgentContext({
      'screen': 'home',
      'counter': _counter,
    });
  }
  
  @override
  void didUpdateWidget(HomeScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    
    // Update context when counter changes
    updateAgentContext({'counter': _counter});
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('DomOS Flutter Demo'),
        actions: [
          // State indicator
          Padding(
            padding: EdgeInsets.all(16),
            child: Text(agentState.toString().split('.').last),
          ),
        ],
      ),
      body: Column(
        children: [
          Text('Counter: $_counter', style: TextStyle(fontSize: 24)),
          Expanded(
            child: DomOSWidget(
              title: 'AI Assistant',
              floating: false,
            ),
          ),
        ],
      ),
    );
  }
}
```

---

## ✅ Checklist d'Implémentation

### Phase 1 : Core (3-5 jours)
- [ ] Protocol ADTP (types, encoder, decoder)
- [ ] DomOSClient (WebSocket, state, streams)
- [ ] ToolRegistry
- [ ] ShadowContext
- [ ] HITLPolicy

### Phase 2 : Flutter Bindings (2-3 jours)
- [ ] DomOSProvider (InheritedWidget)
- [ ] UseAgentMixin
- [ ] UseAgentToolMixin
- [ ] UseAgentContextMixin
- [ ] UseVoiceModeMixin
- [ ] UseApprovalMixin

### Phase 3 : Widgets (2-3 jours)
- [ ] DomOSWidget (chat)
- [ ] ApprovalBanner
- [ ] AgentIndicator
- [ ] AudioOrb
- [ ] FloatingButton

### Phase 4 : Audio (1-2 jours)
- [ ] flutter_sound integration
- [ ] PCM encoding
- [ ] Audio playback

### Phase 5 : Tests (2-3 jours)
- [ ] Unit tests (core)
- [ ] Widget tests
- [ ] Integration tests

### Phase 6 : Documentation (1 jour)
- [ ] API docs
- [ ] Examples
- [ ] Migration guide (React → Flutter)

**Total estimé : 11-17 jours**

---

## 🚀 Avantages de cette Architecture

✅ **100% Compatible** : Même protocole ADTP  
✅ **Type-safe** : Dart + JSON serialization  
✅ **Reactive** : Streams natifs (comme RxDart)  
✅ **Lifecycle-aware** : Mixins auto-cleanup  
✅ **Testable** : Mockito + flutter_test  
✅ **Performant** : Isolates pour background  
✅ **Cross-platform** : Android, iOS, Web, Desktop  
✅ **Maintainable** : Même structure que React  

---

✅ **Architecture Flutter COMPLÈTE pour DomOS !**

**Prêt à démarrer l'implémentation ?** 🚀📱
