# DomOS Flutter SDK - Architecture Complète

> Package `domos_flutter` - Port complet du SDK TypeScript/React vers Flutter
> **Mis à jour : Avril 2026** — Corrections v2 appliquées

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
| `<DomOSProvider>` | `DomOSProvider` / `DomOSScope` | InheritedWidget / InheritedNotifier |
| `useAgent()` | `UseAgentMixin` / `DomOSScope.of(context)` | Mixin ou zero-dep |
| `useAgentTool()` | `UseAgentToolMixin` | Mixin + lifecycle |
| `useAgentContext()` | `UseAgentContextMixin` | Mixin |
| `useVoiceMode()` | `UseVoiceModeMixin` | Mixin + `record` package |
| `useApproval()` | `UseApprovalMixin` | Mixin |
| Components | Widgets | StatelessWidget/StatefulWidget |

### 3. Hooks → Mixins (Lifecycle-aware)

**React Hooks** (pas de lifecycle) → **Flutter Mixins** (lifecycle intégré)

```dart
// React Hook
useAgentTool({ name, handler }, [deps]);

// Flutter Mixin
class _MyWidgetState extends State<MyWidget> with UseAgentToolMixin {
  @override
  void initState() {
    super.initState();
    registerAgentTool(name: 'my_tool', ...);
    // dispose() appele automatiquement par le mixin → unregister auto
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
│   │   ├── core/
│   │   │   ├── client/
│   │   │   │   ├── domos_client.dart
│   │   │   │   ├── client_state.dart
│   │   │   │   └── client_options.dart
│   │   │   │
│   │   │   ├── protocol/
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
│   │   │   │   └── websocket_transport.dart   # WebRTC hors scope Sprint 0
│   │   │   │
│   │   │   └── utils/
│   │   │       ├── logger.dart
│   │   │       └── uuid.dart
│   │   │
│   │   └── flutter/
│   │       ├── provider/
│   │       │   ├── domos_provider.dart
│   │       │   ├── domos_inherited.dart
│   │       │   ├── domos_notifier.dart        # ChangeNotifier zero-dep
│   │       │   └── domos_scope.dart           # InheritedNotifier zero-dep
│   │       │
│   │       ├── mixins/
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
│   │           ├── audio_recorder.dart    # record ^5.0
│   │           ├── audio_player.dart      # flutter_pcm_sound (Sprint 2)
│   │           └── audio_encoder.dart
│   │
│   └── models/
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
import 'dart:convert';
import '../protocol/adtp_types.dart';
import '../protocol/adtp_messages.dart';
import '../tools/tool_registry.dart';
import '../context/shadow_context.dart';
import '../security/hitl_policy.dart';
import '../transport/websocket_transport.dart';
import 'client_state.dart';
import 'client_options.dart';

/// DomOSClient - Core client compatible avec serveur DomOS (protocole ADTP v1.0.0)
class DomOSClient {
  final DomOSClientOptions options;

  WebSocketTransport? _transport;

  ClientState _state = ClientState.disconnected;
  String? _sessionId;
  String? _currentRoute;
  String? _pageTitle;

  final ToolRegistry _toolRegistry = ToolRegistry();
  final ShadowContext _shadowContext = ShadowContext();
  final HITLPolicy _hitlPolicy = HITLPolicy();

  // Tools en attente d'approbation HITL
  final Map<String, _PendingToolCall> _pendingApprovals = {};

  Timer? _reconnectTimer;
  int _reconnectAttempts = 0;

  final _stateController = StreamController<ClientState>.broadcast();
  final _sessionController = StreamController<String>.broadcast();
  final _agentResponseController = StreamController<AgentResponse>.broadcast();
  final _toolCallController = StreamController<ToolCall>.broadcast();
  final _systemEventController = StreamController<SystemEvent>.broadcast();
  final _audioOutputController = StreamController<AudioOutput>.broadcast();
  final _errorController = StreamController<DomOSError>.broadcast();
  final _toolsSyncController = StreamController<List<ToolDeclaration>>.broadcast();
  final _approvalRequestController = StreamController<ApprovalRequest>.broadcast();

  ClientState get state => _state;
  String? get sessionId => _sessionId;
  bool get isConnected =>
      _state == ClientState.connected || _state == ClientState.listening;
  List<ToolDeclaration> get registeredTools => _toolRegistry.getDeclarations();
  int get toolCount => _toolRegistry.count;

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

  // ============================================================
  // Connexion
  // ============================================================

  Future<void> connect() async {
    if (_transport != null) await disconnect();

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

      // HANDSHAKE_INIT — viewport='mobile', userAgent='domos_flutter/0.1.0'
      _send(ADTPMessages.handshakeInit(
        apiKey: options.apiKey,
        userAgent: 'domos_flutter/0.1.0',
        viewport: 'mobile',
        sdkVersion: '0.1.0',
        protocolVersion: '1.0.0',
      ));
    } catch (e) {
      _setState(ClientState.error);
      _errorController.add(DomOSError('Connection failed: $e'));
    }
  }

  Future<void> disconnect() async {
    _reconnectTimer?.cancel();
    await _transport?.disconnect();
    _transport = null;
    _setState(ClientState.disconnected);
  }

  // ============================================================
  // Tools
  // ============================================================

  void registerTool({
    required ToolDeclaration declaration,
    required Future<dynamic> Function(Map<String, dynamic>) handler,
    String? componentId,
    bool global = false,
  }) {
    _toolRegistry.register(RegisteredTool(
      declaration: declaration,
      handler: handler,
      componentId: componentId,
      global: global,
    ));
    if (isConnected) _syncTools();
  }

  void unregisterTool(String name) {
    _toolRegistry.unregister(name);
    if (isConnected) _syncTools();
  }

  /// Bulk cleanup au dispose() d'un widget — unregister tous les tools du composant
  void unregisterToolsByComponent(String componentId) {
    _toolRegistry.unregisterByComponent(componentId);
    if (isConnected) _syncTools();
  }

  // ============================================================
  // Context
  // ============================================================

  void updateContext(Map<String, dynamic> data) {
    _shadowContext.update(data);
    if (isConnected) _syncTools();
  }

  /// Définir la route active (champ url de CONTEXT_UPDATE)
  void setCurrentRoute(String route, {String? title}) {
    _currentRoute = route;
    _pageTitle = title;
    if (isConnected) _syncTools();
  }

  // ============================================================
  // Envoi de messages
  // ============================================================

  void sendText(String text) {
    if (!isConnected) throw StateError('Client not connected');
    _send(ADTPMessages.userInput(content: text, modality: 'text'));
    _setState(ClientState.thinking);
  }

  void sendAudioChunk(String audioBase64, String mimeType) {
    if (!isConnected) throw StateError('Client not connected');
    _send(ADTPMessages.userInput(
      content: audioBase64,
      modality: 'audio',
      mimeType: mimeType,
    ));
  }

  /// Signaler la fin du flux audio (bouton stop, VAD, timeout)
  void sendAudioEnd({String reason = 'user_stop'}) {
    if (!isConnected) return;
    _send(ADTPMessages.voiceInputEnd(reason: reason));
    _setState(ClientState.thinking);
  }

  /// Interrompre l'agent en train de parler (barge-in)
  void sendInterrupt() {
    if (!isConnected) return;
    _send(ADTPMessages.voiceInterrupt());
  }

  // ============================================================
  // HITL - Approbations
  // ============================================================

  Future<void> approveToolCall(String callId) async {
    final pending = _pendingApprovals.remove(callId);
    if (pending == null) return;

    _send(ADTPMessages.approvalResponse(callId: callId, approved: true));

    try {
      final result = await pending.tool.handler(pending.args);
      _send(ADTPMessages.toolResult(
        callId: callId,
        status: 'success',
        result: result,
      ));
    } catch (e) {
      _send(ADTPMessages.toolResult(
        callId: callId,
        status: 'error',
        error: e.toString(),
      ));
    }
  }

  void denyToolCall(String callId) {
    _pendingApprovals.remove(callId);
    _send(ADTPMessages.approvalResponse(callId: callId, approved: false));
  }

  // ============================================================
  // Message Handling
  // ============================================================

  void _handleMessage(Map<String, dynamic> raw) {
    final type = raw['type'] as String?;
    switch (type) {
      case 'HANDSHAKE_ACK':
        _handleHandshakeAck(raw);
      case 'AGENT_RESPONSE':
        _handleAgentResponse(raw);
      case 'TOOL_CALL':
        _handleToolCall(raw);
      case 'AUDIO_STREAM':
        _handleAudioStream(raw);
      case 'SYSTEM_EVENT':
        _handleSystemEvent(raw);
      case 'APPROVAL_REQUEST':
        _handleApprovalRequest(raw);
    }
  }

  void _handleHandshakeAck(Map<String, dynamic> raw) {
    final payload = raw['payload'] as Map<String, dynamic>;
    _sessionId = payload['sessionId'] as String;
    _sessionController.add(_sessionId!);
    _reconnectAttempts = 0;
    _setState(ClientState.connected);
    _syncTools();
  }

  void _handleAgentResponse(Map<String, dynamic> raw) {
    final payload = raw['payload'] as Map<String, dynamic>;
    // Protocole ADTP : champ 'chunk' (pas 'text')
    final chunk = payload['chunk'] as String? ?? '';
    final done = payload['done'] as bool? ?? false;

    _agentResponseController.add(AgentResponse(text: chunk, done: done));

    if (done) {
      _setState(ClientState.listening);
    } else {
      _setState(ClientState.speaking);
    }
  }

  Future<void> _handleToolCall(Map<String, dynamic> raw) async {
    final payload = raw['payload'] as Map<String, dynamic>;
    final callId = payload['callId'] as String;
    final name = payload['name'] as String;
    final args = Map<String, dynamic>.from(payload['args'] as Map);

    _toolCallController.add(ToolCall(callId: callId, name: name, args: args));

    final tool = _toolRegistry.get(name);
    if (tool == null) {
      _send(ADTPMessages.toolResult(
        callId: callId,
        status: 'error',
        error: 'Tool not found: $name',
      ));
      return;
    }

    final requiresApproval = _hitlPolicy.evaluateTool(tool.declaration);
    if (requiresApproval) {
      // Stocker en attente — ne PAS exécuter avant approbation
      _pendingApprovals[callId] = _PendingToolCall(tool: tool, args: args);
      _approvalRequestController.add(ApprovalRequest(
        callId: callId,
        toolName: name,
        args: args,
        risk: tool.declaration.risk ?? 'none',
        message: 'Approve "$name" action?',
      ));
      return;
    }

    try {
      final result = await tool.handler(args);
      _send(ADTPMessages.toolResult(
        callId: callId,
        status: 'success',
        result: result,
      ));
    } catch (e) {
      _send(ADTPMessages.toolResult(
        callId: callId,
        status: 'error',
        error: e.toString(),
      ));
    }
  }

  void _handleAudioStream(Map<String, dynamic> raw) {
    final payload = raw['payload'] as Map<String, dynamic>;
    _audioOutputController.add(AudioOutput(
      audioBase64: payload['data'] as String,
      mimeType: payload['mimeType'] as String,
    ));
  }

  void _handleSystemEvent(Map<String, dynamic> raw) {
    final payload = raw['payload'] as Map<String, dynamic>;
    _systemEventController.add(SystemEvent(
      kind: payload['kind'] as String,
      message: payload['message'] as String?,
    ));
  }

  void _handleApprovalRequest(Map<String, dynamic> raw) {
    final payload = raw['payload'] as Map<String, dynamic>;
    _approvalRequestController.add(ApprovalRequest.fromMap(payload));
  }

  void _handleError(dynamic error) {
    _errorController.add(DomOSError(error.toString()));
    _setState(ClientState.error);
  }

  void _handleClose() {
    _setState(ClientState.disconnected);
    if (options.autoReconnect &&
        _reconnectAttempts < options.maxReconnectAttempts) {
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    _reconnectAttempts++;
    _reconnectTimer = Timer(
      Duration(milliseconds: options.reconnectDelay * _reconnectAttempts),
      () => connect(),
    );
  }

  // ============================================================
  // Sync tools — format ADTP correct
  // CONTEXT_UPDATE : url (requis, '' si pas de routing),
  // activeTools (liste des ToolDeclaration), context (shadowContext)
  // ============================================================

  void _syncTools() {
    final tools = _toolRegistry.getDeclarations();
    _toolsSyncController.add(tools);

    _send(ADTPMessages.contextUpdate(
      url: _currentRoute ?? '',
      title: _pageTitle,
      activeTools: tools,
      context: _shadowContext.isNotEmpty ? _shadowContext.toMap() : null,
    ));
  }

  void _setState(ClientState newState) {
    if (_state != newState) {
      _state = newState;
      _stateController.add(newState);
    }
  }

  void _send(Map<String, dynamic> message) {
    _transport?.send(jsonEncode(message));
  }

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
  final bool global;

  RegisteredTool({
    required this.declaration,
    required this.handler,
    this.componentId,
    this.global = false,
  });
}

class _PendingToolCall {
  final RegisteredTool tool;
  final Map<String, dynamic> args;
  _PendingToolCall({required this.tool, required this.args});
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

### 2. Flutter - State Layer (zero-dep)

#### DomOSNotifier (ChangeNotifier)

```dart
// lib/src/flutter/provider/domos_notifier.dart

import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../core/client/domos_client.dart';
import '../../core/client/client_state.dart';
import '../../models/approval_request.dart';

/// DomOSNotifier - Couche state management zero-dep
///
/// Compatible nativement avec :
/// - ListenableBuilder (Flutter natif, zéro dépendance)
/// - Provider (ChangeNotifierProvider)
/// - Riverpod (ChangeNotifierProvider.autoDispose)
/// - GetX (wrapper Controller)
/// - Bloc (écoute directe des streams du client)
class DomOSNotifier extends ChangeNotifier {
  final DomOSClient client;

  ClientState _agentState = ClientState.disconnected;
  String? _lastResponse;
  String? _sessionId;
  ApprovalRequest? _pendingApproval;
  String? _systemError;

  final List<StreamSubscription> _subscriptions = [];

  ClientState get agentState => _agentState;
  String? get lastResponse => _lastResponse;
  String? get sessionId => _sessionId;
  ApprovalRequest? get pendingApproval => _pendingApproval;
  String? get systemError => _systemError;
  bool get isConnected =>
      _agentState == ClientState.connected ||
      _agentState == ClientState.listening;
  bool get isThinking => _agentState == ClientState.thinking;
  bool get isSpeaking => _agentState == ClientState.speaking;

  DomOSNotifier(this.client) {
    _subscriptions.addAll([
      client.stateStream.listen((s) {
        _agentState = s;
        if (s != ClientState.error) _systemError = null;
        notifyListeners();
      }),
      client.agentResponseStream.listen((r) {
        if (r.done) {
          _lastResponse = r.text;
          _systemError = null;
          notifyListeners();
        }
      }),
      client.sessionStream.listen((id) {
        _sessionId = id;
        notifyListeners();
      }),
      client.approvalRequestStream.listen((req) {
        _pendingApproval = req;
        notifyListeners();
      }),
      client.systemEventStream.listen((evt) {
        if (evt.kind == 'error') {
          _systemError = evt.message ?? 'Erreur inconnue';
          notifyListeners();
        }
      }),
    ]);
  }

  void sendText(String text) => client.sendText(text);

  Future<void> approve() async {
    final callId = _pendingApproval?.callId;
    if (callId == null) return;
    _pendingApproval = null;
    notifyListeners();
    await client.approveToolCall(callId);
  }

  void deny() {
    final callId = _pendingApproval?.callId;
    if (callId == null) return;
    _pendingApproval = null;
    notifyListeners();
    client.denyToolCall(callId);
  }

  @override
  void dispose() {
    for (final sub in _subscriptions) {
      sub.cancel();
    }
    client.dispose();
    super.dispose();
  }
}
```

#### DomOSScope (InheritedNotifier zero-dep)

```dart
// lib/src/flutter/provider/domos_scope.dart

import 'package:flutter/widgets.dart';
import 'domos_notifier.dart';

/// DomOSScope - InheritedNotifier zero-dep
///
/// Alternative à DomOSProvider pour les apps sans Provider/Riverpod.
///
/// Utilisation :
///   DomOSScope(
///     notifier: DomOSNotifier(client),
///     child: MyApp(),
///   )
///
/// Lecture dans n'importe quel widget descendant :
///   final notifier = DomOSScope.of(context);
class DomOSScope extends InheritedNotifier<DomOSNotifier> {
  const DomOSScope({
    super.key,
    required DomOSNotifier notifier,
    required super.child,
  }) : super(notifier: notifier);

  static DomOSNotifier of(BuildContext context) {
    final scope =
        context.dependOnInheritedWidgetOfExactType<DomOSScope>();
    assert(scope != null, 'No DomOSScope found in context');
    return scope!.notifier!;
  }

  static DomOSNotifier? maybeOf(BuildContext context) {
    return context
        .dependOnInheritedWidgetOfExactType<DomOSScope>()
        ?.notifier;
  }
}
```

---

### 3. Flutter - Provider (InheritedWidget complet)

```dart
// lib/src/flutter/provider/domos_provider.dart

import 'package:flutter/widgets.dart';
import '../../core/client/domos_client.dart';
import '../../core/client/client_options.dart';
import '../../core/client/client_state.dart';
import 'domos_inherited.dart';
import 'domos_notifier.dart';

/// DomOSProvider - Provider principal pour partager DomOSClient
/// Équivalent de DomOSProvider React.
class DomOSProvider extends StatefulWidget {
  final String apiKey;
  final String endpoint;
  final bool autoConnect;
  final bool debug;
  final bool virtualLines;
  final Widget child;

  const DomOSProvider({
    super.key,
    required this.apiKey,
    required this.endpoint,
    this.autoConnect = true,
    this.debug = false,
    this.virtualLines = false,
    required this.child,
  });

  static DomOSClient of(BuildContext context) {
    final inherited =
        context.dependOnInheritedWidgetOfExactType<DomOSInherited>();
    assert(inherited != null, 'No DomOSProvider found in context');
    return inherited!.client;
  }

  static DomOSClient? maybeOf(BuildContext context) {
    return context
        .dependOnInheritedWidgetOfExactType<DomOSInherited>()
        ?.client;
  }

  @override
  State<DomOSProvider> createState() => _DomOSProviderState();
}

class _DomOSProviderState extends State<DomOSProvider> {
  late DomOSClient _client;
  late DomOSNotifier _notifier;
  ClientState _state = ClientState.disconnected;
  String? _sessionId;

  @override
  void initState() {
    super.initState();

    _client = DomOSClient(DomOSClientOptions(
      endpoint: widget.endpoint,
      apiKey: widget.apiKey,
      debug: widget.debug,
      autoReconnect: true,
      virtualLines: widget.virtualLines,
    ));

    _notifier = DomOSNotifier(_client);

    _client.stateStream.listen((s) => setState(() => _state = s));
    _client.sessionStream.listen((id) => setState(() => _sessionId = id));

    if (widget.autoConnect) _client.connect();
  }

  @override
  void dispose() {
    _notifier.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DomOSInherited(
      client: _client,
      notifier: _notifier,
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
import 'domos_notifier.dart';

class DomOSInherited extends InheritedWidget {
  final DomOSClient client;
  final DomOSNotifier notifier;
  final ClientState state;
  final String? sessionId;

  const DomOSInherited({
    super.key,
    required this.client,
    required this.notifier,
    required this.state,
    required this.sessionId,
    required super.child,
  });

  @override
  bool updateShouldNotify(DomOSInherited oldWidget) {
    return client != oldWidget.client ||
        state != oldWidget.state ||
        sessionId != oldWidget.sessionId;
  }
}
```

---

### 4. Flutter - Mixins (Hooks → Mixins)

#### UseAgentMixin

```dart
// lib/src/flutter/mixins/use_agent.dart

import 'package:flutter/widgets.dart';
import '../../core/client/domos_client.dart';
import '../../core/client/client_state.dart';
import '../provider/domos_provider.dart';

/// Mixin UseAgent - Accès au client DomOS
/// Équivalent de useAgent() React hook.
mixin UseAgentMixin<T extends StatefulWidget> on State<T> {
  DomOSClient get agent => DomOSProvider.of(context);

  void sendText(String text) => agent.sendText(text);
  void sendAudioChunk(String base64, String mimeType) =>
      agent.sendAudioChunk(base64, mimeType);
  void sendAudioEnd({String reason = 'user_stop'}) =>
      agent.sendAudioEnd(reason: reason);
  void sendInterrupt() => agent.sendInterrupt();

  ClientState get agentState => agent.state;
  String? get sessionId => agent.sessionId;
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

/// Mixin UseAgentTool - Enregistrer un ou plusieurs tools avec lifecycle automatique
///
/// CORRECTION v2 : supporte plusieurs registerAgentTool() dans le même initState().
/// dispose() appelle unregisterToolsByComponent() — bulk cleanup automatique.
mixin UseAgentToolMixin<T extends StatefulWidget> on State<T> {
  DomOSClient get _client => DomOSProvider.of(context);
  final List<String> _registeredToolNames = [];

  void registerAgentTool({
    required String name,
    required String description,
    required Future<dynamic> Function(Map<String, dynamic>) handler,
    ToolParameters? parameters,
    String risk = 'none',
    bool global = false,
  }) {
    _registeredToolNames.add(name);
    _client.registerTool(
      declaration: ToolDeclaration(
        name: name,
        description: description,
        parameters: parameters,
        risk: risk,
      ),
      handler: handler,
      componentId: hashCode.toString(),
      global: global,
    );
  }

  @override
  void dispose() {
    _client.unregisterToolsByComponent(hashCode.toString());
    super.dispose();
  }
}
```

**Utilisation** :

```dart
class _ProductCardState extends State<ProductCard>
    with UseAgentToolMixin {

  @override
  void initState() {
    super.initState();

    // Tool 1
    registerAgentTool(
      name: 'like_product',
      description: 'Add ${widget.product.name} to favorites',
      handler: (args) async {
        final shouldLike = args['shouldLike'] as bool;
        setState(() => _isLiked = shouldLike);
        return shouldLike ? 'Added to favorites' : 'Removed';
      },
      parameters: ToolParameters(
        type: 'OBJECT',
        properties: {
          'shouldLike': ToolParameterProperty(
            type: 'BOOLEAN',
            description: 'True to like, false to unlike',
          ),
        },
        required: ['shouldLike'],
      ),
    );

    // Tool 2 — même widget, plusieurs tools
    registerAgentTool(
      name: 'add_to_cart',
      description: 'Add ${widget.product.name} to cart',
      handler: (args) async {
        final qty = args['quantity'] as int? ?? 1;
        await cart.add(widget.product.id, qty);
        return 'Added $qty item(s) to cart';
      },
    );
    // dispose() → les 2 tools désenregistrés automatiquement
  }
}
```

#### UseNavigationToolMixin

```dart
// lib/src/flutter/mixins/use_navigation_tool.dart

import 'package:flutter/widgets.dart';
import 'use_agent_tool.dart';

/// Mixin UseNavigationTool - Enregistrer le tool 'navigate'
/// Équivalent de useNavigationTool() React hook.
mixin UseNavigationToolMixin<T extends StatefulWidget>
    on State<T>, UseAgentToolMixin<T> {

  void registerNavigationTool({
    required String description,
    required void Function(String url, {bool replace}) onNavigate,
  }) {
    registerAgentTool(
      name: 'navigate',
      description: description,
      handler: (args) async {
        final url = args['url'] as String;
        final replace = args['replace'] as bool? ?? false;
        onNavigate(url, replace: replace);
        return 'Navigated to $url';
      },
      global: true,
    );
  }
}
```

#### UseViewStateToolMixin

```dart
// lib/src/flutter/mixins/use_view_state_tool.dart

import 'package:flutter/widgets.dart';
import 'use_agent_tool.dart';

/// Mixin UseViewStateTool - Enregistrer le tool 'ui_state'
/// Équivalent de useViewStateTool() React hook.
mixin UseViewStateToolMixin<T extends StatefulWidget>
    on State<T>, UseAgentToolMixin<T> {

  void registerViewStateTool({
    required String viewId,
    required String description,
    required Future<String> Function(
      String action,
      Map<String, dynamic> params,
    ) handler,
  }) {
    registerAgentTool(
      name: 'ui_state',
      description: description,
      handler: (args) async {
        final action = args['action'] as String;
        final params = Map<String, dynamic>.from(
          args['params'] as Map? ?? {},
        );
        return await handler(action, params);
      },
    );
  }
}
```

#### UseAgentContextMixin

```dart
// lib/src/flutter/mixins/use_agent_context.dart

import 'package:flutter/widgets.dart';
import '../../core/client/domos_client.dart';
import '../provider/domos_provider.dart';

/// Mixin UseAgentContext - Injecter du contexte passif dans le LLM
/// Équivalent de useAgentContext() React hook.
mixin UseAgentContextMixin<T extends StatefulWidget> on State<T> {
  DomOSClient get _client => DomOSProvider.of(context);

  void updateAgentContext(Map<String, dynamic> data) {
    _client.updateContext(data);
  }
}
```

**Utilisation** :

```dart
class _UserProfileState extends State<UserProfile>
    with UseAgentContextMixin {

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    updateAgentContext({
      'userId': widget.user.id,
      'userName': widget.user.name,
      'userRole': widget.user.role,
    });
  }

  @override
  Widget build(BuildContext context) => Text('Welcome ${widget.user.name}');
}
```

#### UseVoiceModeMixin

> ⚠️ **Sprint 2 uniquement** — Voix hors scope Sprint 0.
> `flutter_sound` remplacé par `record ^5.0` (stable, PCM natif cross-platform).

```dart
// lib/src/flutter/mixins/use_voice_mode.dart

import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/widgets.dart';
import 'package:record/record.dart';
import '../../core/client/domos_client.dart';
import '../provider/domos_provider.dart';

/// Mixin UseVoiceMode - Enregistrement micro PCM + streaming ADTP
/// Dépendance : record ^5.0.0
mixin UseVoiceModeMixin<T extends StatefulWidget> on State<T> {
  DomOSClient get _client => DomOSProvider.of(context);

  final AudioRecorder _recorder = AudioRecorder();
  StreamSubscription<Uint8List>? _recordSub;
  bool _isRecording = false;

  bool get isRecording => _isRecording;

  Future<void> startRecording() async {
    final config = RecordConfig(
      encoder: AudioEncoder.pcm16bits,
      sampleRate: 16000,
      numChannels: 1,
    );

    final stream = await _recorder.startStream(config);
    _recordSub = stream.listen((chunk) {
      _client.sendAudioChunk(base64Encode(chunk), 'audio/pcm;rate=16000');
    });

    setState(() => _isRecording = true);
  }

  Future<void> stopRecording({String reason = 'user_stop'}) async {
    await _recordSub?.cancel();
    _recordSub = null;
    await _recorder.stop();
    _client.sendAudioEnd(reason: reason);
    setState(() => _isRecording = false);
  }

  void interruptAgent() => _client.sendInterrupt();

  @override
  void dispose() {
    _recordSub?.cancel();
    _recorder.dispose();
    super.dispose();
  }
}
```

#### UseApprovalMixin

```dart
// lib/src/flutter/mixins/use_approval.dart

import 'package:flutter/widgets.dart';
import '../../core/client/domos_client.dart';
import '../../models/approval_request.dart';
import '../provider/domos_provider.dart';

/// Mixin UseApproval - Gérer les approbations HITL
/// Équivalent de useApproval() React hook.
mixin UseApprovalMixin<T extends StatefulWidget> on State<T> {
  DomOSClient get _client => DomOSProvider.of(context);

  Stream<ApprovalRequest> get approvalRequests => _client.approvalRequestStream;

  Future<void> approve(String callId) => _client.approveToolCall(callId);
  void deny(String callId) => _client.denyToolCall(callId);
}
```

---

### 5. Flutter - Widgets

#### DomOSWidget (Chat complet)

```dart
// lib/src/flutter/widgets/chat/domos_widget.dart

import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/client/client_state.dart';
import '../../mixins/use_agent.dart';

/// DomOSWidget - Widget chat complet
/// Équivalent de <DomOSWidget /> React.
class DomOSWidget extends StatefulWidget {
  final String? title;
  final Color? primaryColor;
  final bool floating;

  const DomOSWidget({
    super.key,
    this.title,
    this.primaryColor,
    this.floating = true,
  });

  @override
  State<DomOSWidget> createState() => _DomOSWidgetState();
}

class _DomOSWidgetState extends State<DomOSWidget> with UseAgentMixin {
  final _messages = <ChatMessage>[];
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  bool _isOpen = false;
  StreamSubscription? _responseSub;
  final _pendingResponse = StringBuffer();

  @override
  void initState() {
    super.initState();

    // Accumule les chunks jusqu'à done=true
    _responseSub = agent.agentResponseStream.listen((response) {
      _pendingResponse.write(response.text);

      if (response.done) {
        setState(() {
          _messages.add(ChatMessage(
            text: _pendingResponse.toString(),
            isUser: false,
            timestamp: DateTime.now(),
          ));
          _pendingResponse.clear();
        });
        _scrollToBottom();
      }
    });
  }

  @override
  void dispose() {
    _responseSub?.cancel();
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
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
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return widget.floating ? _buildFloating() : _buildChatWindow();
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
          _buildHeader(),
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              itemCount: _messages.length,
              itemBuilder: (_, i) => MessageBubble(message: _messages[i]),
            ),
          ),
          _buildInput(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: widget.primaryColor ?? Colors.blue,
        borderRadius:
            const BorderRadius.vertical(top: Radius.circular(12)),
      ),
      child: Row(
        children: [
          Text(
            widget.title ?? 'AI Assistant',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const Spacer(),
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: _stateColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInput() {
    return Container(
      padding: const EdgeInsets.all(8),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _controller,
              decoration: const InputDecoration(
                hintText: 'Type a message...',
                border: OutlineInputBorder(),
              ),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.send),
            onPressed: _sendMessage,
          ),
        ],
      ),
    );
  }

  Color get _stateColor {
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

  const MessageBubble({required this.message, super.key});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment:
          message.isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.all(8),
        padding: const EdgeInsets.all(12),
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
description: DomOS Flutter SDK - AI Agent Framework compatible with DomOS server (ADTP v1.0.0)
version: 0.1.0
homepage: https://github.com/your-org/domos
repository: https://github.com/your-org/domos-flutter

environment:
  sdk: '>=3.2.0 <4.0.0'     # Dart 3.2+ requis (sealed classes, switch expressions)
  flutter: '>=3.16.0'

dependencies:
  flutter:
    sdk: flutter

  # WebSocket cross-platform (mobile + web + desktop)
  web_socket_channel: ^3.0.0

  # HTTP (Virtual Lines)
  http: ^1.2.0

  # Logging
  logger: ^2.1.0

  # UUID
  uuid: ^4.3.0

  # Audio — enregistrement PCM cross-platform (Sprint 2)
  # record: ^5.0.0              # Décommenter en Sprint 2
  # permission_handler: ^11.3.0 # Permissions micro iOS/Android

  # Audio — playback PCM streaming (Sprint 2, à évaluer)
  # flutter_pcm_sound: ^0.3.0   # Évaluer iOS + Android avant Sprint 2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.1
  mockito: ^5.4.4
  build_runner: ^2.4.8
```

> **Note** : `flutter_sound` supprimé — package historiquement instable (`StreamSink<Food>` non fonctionnel en v9+). Remplacé par `record ^5.0` pour l'enregistrement PCM. Playback PCM streaming évalué avec `flutter_pcm_sound` avant Sprint 2.

---

## 🎯 Example App

```dart
// example/lib/main.dart

import 'package:flutter/material.dart';
import 'package:domos_flutter/domos_flutter.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DomOS Flutter Demo',
      home: DomOSProvider(
        apiKey: 'pk_demo_local',
        endpoint: 'ws://localhost:3000/domos',
        autoConnect: true,
        child: const HomeScreen(),
      ),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with UseAgentMixin,
         UseAgentToolMixin,
         UseAgentContextMixin,
         UseNavigationToolMixin {
  int _counter = 0;

  @override
  void initState() {
    super.initState();

    registerAgentTool(
      name: 'increment_counter',
      description: 'Increment the counter on the home screen',
      handler: (args) async {
        setState(() => _counter++);
        return 'Counter is now $_counter';
      },
    );

    registerNavigationTool(
      description: 'Navigate to a screen. Routes: /home, /profile, /settings',
      onNavigate: (url, {replace = false}) {
        if (replace) {
          Navigator.pushReplacementNamed(context, url);
        } else {
          Navigator.pushNamed(context, url);
        }
      },
    );

    updateAgentContext({'screen': 'home', 'counter': _counter});
  }

  @override
  void didUpdateWidget(HomeScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    updateAgentContext({'counter': _counter});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('DomOS Flutter Demo'),
        actions: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(agentState.name),
          ),
        ],
      ),
      body: Column(
        children: [
          Text('Counter: $_counter',
              style: const TextStyle(fontSize: 24)),
          const Expanded(
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

## ✅ Checklist d'Implémentation (Sprints)

### Sprint 0 — Core + Text (priorité absolue)
- [ ] Protocol ADTP Dart (types, encoder, decoder) — format `CONTEXT_UPDATE` avec `url` + `activeTools`
- [ ] `DomOSClient` : WebSocket, state, streams, `_pendingApprovals` Map
- [ ] `unregisterToolsByComponent()` dans `ToolRegistry`
- [ ] `sendAudioEnd()` + `sendInterrupt()` dans `DomOSClient`
- [ ] `DomOSNotifier` (ChangeNotifier zero-dep)
- [ ] `DomOSScope` (InheritedNotifier zero-dep)
- [ ] `DomOSProvider` + `DomOSInherited`
- [ ] `UseAgentMixin`, `UseAgentToolMixin` (multi-tools), `UseAgentContextMixin`
- [ ] `UseNavigationToolMixin`, `UseViewStateToolMixin`
- [ ] Démo text-only fonctionnelle connectée au serveur DomOS réel

### Sprint 1 — Widgets + Navigation
- [ ] `DomOSWidget` (chat panel, streaming réponse)
- [ ] `AgentIndicator` (indicateur animé)
- [ ] `ApprovalBanner` (HITL non-bloquant)
- [ ] Exemple app e-commerce

### Sprint 2 — Voice (gated décision playback)
- [ ] Évaluation `flutter_pcm_sound` sur iOS + Android avant démarrage
- [ ] `UseVoiceModeMixin` avec `record ^5.0` (PCM 16kHz stream)
- [ ] `DomOSVoiceController` (ChangeNotifier standalone)
- [ ] `VoiceButton` widget

### Sprint 3 — HITL complet + Adaptateurs
- [ ] `ApprovalModal` (Dialog Flutter standard)
- [ ] `DomOSOverlayDelegate` (GlobalKey<NavigatorState>)
- [ ] `domos_flutter_provider` adapter
- [ ] `domos_flutter_riverpod` adapter

### Sprint 4 — Publication
- [ ] CI/CD (GitHub Actions)
- [ ] Documentation API (dartdoc)
- [ ] Migration guide React → Flutter
- [ ] Publication pub.dev

**Total estimé Sprint 0-1 : 7-10 jours**

---

## 🚀 Avantages de cette Architecture

✅ **100% Compatible** : Même protocole ADTP v1.0.0
✅ **Type-safe** : Dart 3.2+ (enums, switch expressions)
✅ **Reactive** : Streams natifs Dart (pas de RxDart requis)
✅ **Lifecycle-aware** : Mixins auto-cleanup (multi-tools par widget)
✅ **Zero-dep state** : `DomOSNotifier` + `DomOSScope` sans Provider
✅ **Testable** : Mockito + flutter_test
✅ **Cross-platform** : Android, iOS, Web, Desktop
✅ **Évolutif** : Adaptateurs Provider/Riverpod/GetX/Bloc en Sprint 3

---

## ⚠️ Décisions ouvertes avant Sprint 0

| # | Question | Recommandation |
|---|---|---|
| D1 | Latence voix 150–400ms acceptable ? | À trancher avant Sprint 2 |
| D2 | `DomOSOverlayDelegate` intégré ou package séparé ? | Intégré, optionnel (Sprint 3) |
| D3 | Position monorepo (`domos/packages/flutter/`) ou dépôt séparé ? | Monorepo Sprint 0-2 |
| D4 | Flutter SDK minimum confirmé à 3.16+ / Dart 3.2+ ? | Oui, confirmé |