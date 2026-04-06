# DomOS Flutter Client - Architecture & Specification

> Package `domos_flutter` compatible avec le serveur DomOS existant

---

## 📊 Analyse du Client Existant

### Architecture Actuelle (TypeScript)

```
┌─────────────────────────────────────────────────────────────┐
│                    @domos/core                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │           DomOSClient (TypeScript)                 │     │
│  │  - WebSocket / WebRTC transport                    │     │
│  │  - Tool Registry local                             │     │
│  │  - ADTP Protocol (encode/decode)                   │     │
│  │  - Shadow Context management                       │     │
│  │  - HITL Policy & Approvals                         │     │
│  │  - State management                                │     │
│  │  - Auto-reconnect                                  │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
┌──────────▼─────┐  ┌──────▼──────┐  ┌────▼─────────┐
│  @domos/react  │  │ @domos/vue  │  │ @domos/svelte│
│  - Provider    │  │ - Plugin    │  │  - Stores    │
│  - Hooks       │  │ - Composables│ │  - Actions   │
│  - Components  │  │ - Components│  │  - Components│
└────────────────┘  └─────────────┘  └──────────────┘
```

### Fonctionnalités Core du Client TypeScript

✅ **Transport Layer**
- WebSocket (défaut)
- WebRTC DataChannel (optionnel)
- Auto-reconnect avec backoff
- Virtual Lines (acquisition HTTP)

✅ **Protocol ADTP**
- Encode/decode messages
- Handshake (HANDSHAKE_INIT → HANDSHAKE_ACK)
- Message types (USER_INPUT, TOOL_CALL, AGENT_RESPONSE, etc.)
- Version négociation

✅ **Tool System**
- Registry local (Map)
- Auto-sync avec serveur
- Execution locale des tools
- HITL (Human-in-the-Loop) policy

✅ **State Management**
- States: disconnected, connecting, connected, listening, thinking, speaking, error
- Event handlers (onStateChange, onAgentResponse, etc.)
- Session tracking

✅ **Shadow Context**
- Capture état DOM
- Sync automatique avec serveur
- Context enrichment

✅ **Audio Support**
- Receive audio streams (base64)
- Send audio input (PCM/WAV)
- Modality: text | audio

---

## 🎯 Architecture Flutter Proposée

### Structure du Package `domos_flutter`

```
domos_flutter/
├── pubspec.yaml
├── lib/
│   ├── domos_flutter.dart                    # Export principal
│   │
│   ├── src/
│   │   ├── core/
│   │   │   ├── domos_client.dart             # Client principal
│   │   │   ├── client_state.dart             # Enum States
│   │   │   └── client_options.dart           # Config options
│   │   │
│   │   ├── protocol/
│   │   │   ├── adtp_types.dart               # Types ADTP
│   │   │   ├── adtp_messages.dart            # Messages builders
│   │   │   ├── adtp_encoder.dart             # JSON encode
│   │   │   ├── adtp_decoder.dart             # JSON decode
│   │   │   └── adtp_constants.dart           # ADTP version, etc.
│   │   │
│   │   ├── transport/
│   │   │   ├── transport.dart                # Interface Transport
│   │   │   ├── websocket_transport.dart      # WebSocket impl
│   │   │   └── webrtc_transport.dart         # WebRTC impl (optionnel)
│   │   │
│   │   ├── tools/
│   │   │   ├── tool_registry.dart            # Registry local
│   │   │   ├── tool_types.dart               # ToolDeclaration, etc.
│   │   │   └── tool_handler.dart             # Handler wrapper
│   │   │
│   │   ├── security/
│   │   │   ├── hitl_policy.dart              # HITL rules
│   │   │   ├── hitl_types.dart               # ApprovalRequest, etc.
│   │   │   └── approval_manager.dart         # Gestion approvals
│   │   │
│   │   ├── context/
│   │   │   ├── shadow_context.dart           # Shadow Context
│   │   │   └── context_manager.dart          # Sync manager
│   │   │
│   │   ├── audio/
│   │   │   ├── audio_recorder.dart           # Enregistrement
│   │   │   ├── audio_player.dart             # Playback
│   │   │   └── audio_encoder.dart            # PCM/WAV encoding
│   │   │
│   │   └── utils/
│   │       ├── logger.dart                   # Logging
│   │       └── extensions.dart               # Extensions Dart
│   │
│   └── widgets/                               # UI Widgets (optionnel)
│       ├── domos_provider.dart               # InheritedWidget
│       ├── domos_chat_widget.dart            # Chat UI
│       ├── domos_audio_button.dart           # Audio recording button
│       ├── domos_approval_dialog.dart        # HITL approval UI
│       └── domos_indicator.dart              # Loading indicator
│
├── example/
│   ├── pubspec.yaml
│   ├── lib/
│   │   └── main.dart                         # Example app
│   └── test/
│
└── test/
    ├── core/
    │   └── domos_client_test.dart
    ├── protocol/
    │   └── adtp_messages_test.dart
    └── tools/
        └── tool_registry_test.dart
```

---

## 📦 pubspec.yaml

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
  
  # WebRTC (optionnel)
  flutter_webrtc: ^0.11.0
  
  # HTTP pour Virtual Lines
  http: ^1.2.0
  
  # JSON
  json_annotation: ^4.8.1
  
  # State Management (optionnel, selon choix)
  riverpod: ^2.4.0
  # OU
  # provider: ^6.1.0
  # OU
  # bloc: ^8.1.0
  
  # Audio
  record: ^5.0.0
  audioplayers: ^6.0.0
  
  # Logging
  logger: ^2.0.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  build_runner: ^2.4.0
  json_serializable: ^6.7.0
  mockito: ^5.4.0
```

---

## 💻 Implémentation Core

### 1. DomOSClient (Principal)

```dart
// lib/src/core/domos_client.dart

import 'dart:async';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../protocol/adtp_types.dart';
import '../protocol/adtp_messages.dart';
import '../protocol/adtp_encoder.dart';
import '../protocol/adtp_decoder.dart';
import '../tools/tool_registry.dart';
import '../transport/websocket_transport.dart';
import 'client_state.dart';
import 'client_options.dart';

/// DomOSClient - Client Flutter pour DomOS Framework
/// 
/// Compatible avec le serveur DomOS existant via protocole ADTP.
class DomOSClient {
  final DomOSClientOptions options;
  
  // Transport
  WebSocketTransport? _transport;
  
  // State
  ClientState _state = ClientState.disconnected;
  String? _sessionId;
  
  // Tool Registry
  final ToolRegistry _toolRegistry = ToolRegistry();
  
  // Shadow Context
  final Map<String, dynamic> _context = {};
  
  // Reconnection
  Timer? _reconnectTimer;
  int _reconnectAttempts = 0;
  
  // Stream Controllers
  final _stateController = StreamController<ClientState>.broadcast();
  final _sessionController = StreamController<String>.broadcast();
  final _agentResponseController = StreamController<AgentResponse>.broadcast();
  final _toolCallController = StreamController<ToolCall>.broadcast();
  final _systemEventController = StreamController<SystemEvent>.broadcast();
  final _audioOutputController = StreamController<AudioOutput>.broadcast();
  final _errorController = StreamController<DomOSError>.broadcast();
  
  // Getters
  ClientState get state => _state;
  String? get sessionId => _sessionId;
  bool get isConnected => _state == ClientState.connected || _state == ClientState.listening;
  List<ToolDeclaration> get registeredTools => _toolRegistry.getDeclarations();
  
  // Streams
  Stream<ClientState> get stateStream => _stateController.stream;
  Stream<String> get sessionStream => _sessionController.stream;
  Stream<AgentResponse> get agentResponseStream => _agentResponseController.stream;
  Stream<ToolCall> get toolCallStream => _toolCallController.stream;
  Stream<SystemEvent> get systemEventStream => _systemEventController.stream;
  Stream<AudioOutput> get audioOutputStream => _audioOutputController.stream;
  Stream<DomOSError> get errorStream => _errorController.stream;
  
  DomOSClient(this.options);
  
  /// Connecter au serveur DomOS
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
      _send(AdtpMessages.handshakeInit(
        options.apiKey,
        'DomOSFlutter',
        '0x0',
        '1.0.0', // SDK version
        '1.0.0', // ADTP version
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
  void registerTool(
    ToolDeclaration declaration,
    Future<dynamic> Function(Map<String, dynamic> args) handler,
  ) {
    _toolRegistry.register(declaration, handler);
    
    // Si connecté, sync avec serveur
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
  
  /// Envoyer un message texte
  void sendText(String text) {
    if (!isConnected) {
      throw StateError('Client not connected');
    }
    
    _send(AdtpMessages.userInput(text, 'text'));
    _setState(ClientState.thinking);
  }
  
  /// Envoyer audio (base64)
  void sendAudio(String audioBase64, String mimeType) {
    if (!isConnected) {
      throw StateError('Client not connected');
    }
    
    _send(AdtpMessages.userInput(audioBase64, 'audio', mimeType));
    _setState(ClientState.thinking);
  }
  
  /// Mettre à jour le Shadow Context
  void updateContext(Map<String, dynamic> context) {
    _context.addAll(context);
    
    if (isConnected) {
      _send(AdtpMessages.contextUpdate(_context));
    }
  }
  
  /// Gérer les messages entrants
  void _handleMessage(AdtpMessage message) {
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
      
      default:
        print('Unknown message type: ${message.type}');
    }
  }
  
  void _handleHandshakeAck(AdtpMessage message) {
    final payload = message.payload as HandshakeAckPayload;
    _sessionId = payload.sessionId;
    _sessionController.add(payload.sessionId);
    
    _setState(ClientState.connected);
    
    // Sync tools après connexion
    _syncTools();
    
    // Envoyer le context initial si présent
    if (_context.isNotEmpty) {
      _send(AdtpMessages.contextUpdate(_context));
    }
  }
  
  void _handleAgentResponse(AdtpMessage message) {
    final payload = message.payload as AgentResponsePayload;
    _agentResponseController.add(AgentResponse(
      text: payload.text,
      done: payload.done,
    ));
    
    if (payload.done) {
      _setState(ClientState.listening);
    }
  }
  
  Future<void> _handleToolCall(AdtpMessage message) async {
    final payload = message.payload as ToolCallPayload;
    _toolCallController.add(ToolCall.fromPayload(payload));
    
    // Exécuter le tool localement
    final tool = _toolRegistry.get(payload.name);
    if (tool == null) {
      _send(AdtpMessages.toolResult(
        payload.callId,
        'error',
        error: 'Tool not found: ${payload.name}',
      ));
      return;
    }
    
    try {
      final result = await tool.handler(payload.args);
      _send(AdtpMessages.toolResult(payload.callId, 'success', result: result));
    } catch (e) {
      _send(AdtpMessages.toolResult(payload.callId, 'error', error: e.toString()));
    }
  }
  
  void _handleAudioStream(AdtpMessage message) {
    final payload = message.payload as AudioStreamPayload;
    _audioOutputController.add(AudioOutput(
      audioBase64: payload.data,
      mimeType: payload.mimeType,
    ));
  }
  
  void _handleSystemEvent(AdtpMessage message) {
    final payload = message.payload as SystemEventPayload;
    _systemEventController.add(SystemEvent(
      kind: payload.kind,
      message: payload.message,
    ));
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
    final delay = Duration(milliseconds: options.reconnectDelay);
    
    _reconnectTimer = Timer(delay, () {
      connect();
    });
  }
  
  void _syncTools() {
    final tools = _toolRegistry.getDeclarations();
    _send(AdtpMessages.contextUpdate({
      '_tools': tools.map((t) => t.toJson()).toList(),
    }));
  }
  
  void _setState(ClientState newState) {
    if (_state != newState) {
      _state = newState;
      _stateController.add(newState);
    }
  }
  
  void _send(AdtpMessage message) {
    _transport?.send(AdtpEncoder.encode(message));
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
  }
}
```

---

### 2. Protocol ADTP (Messages)

```dart
// lib/src/protocol/adtp_messages.dart

import 'adtp_types.dart';

/// Messages builders pour ADTP
class AdtpMessages {
  /// HANDSHAKE_INIT (Client → Server)
  static AdtpMessage handshakeInit(
    String apiKey,
    String clientName,
    String clientVersion,
    String sdkVersion,
    String adtpVersion,
  ) {
    return AdtpMessage(
      type: MessageType.handshakeInit,
      payload: {
        'apiKey': apiKey,
        'clientName': clientName,
        'clientVersion': clientVersion,
        'sdkVersion': sdkVersion,
        'adtpVersion': adtpVersion,
      },
    );
  }
  
  /// USER_INPUT (Client → Server)
  static AdtpMessage userInput(
    String content,
    String modality, {
    String? mimeType,
  }) {
    return AdtpMessage(
      type: MessageType.userInput,
      payload: {
        'content': content,
        'modality': modality,
        if (mimeType != null) 'mimeType': mimeType,
      },
    );
  }
  
  /// CONTEXT_UPDATE (Client → Server)
  static AdtpMessage contextUpdate(Map<String, dynamic> context) {
    return AdtpMessage(
      type: MessageType.contextUpdate,
      payload: context,
    );
  }
  
  /// TOOL_RESULT (Client → Server)
  static AdtpMessage toolResult(
    String callId,
    String status, {
    dynamic result,
    String? error,
  }) {
    return AdtpMessage(
      type: MessageType.toolResult,
      payload: {
        'callId': callId,
        'status': status,
        if (result != null) 'result': result,
        if (error != null) 'error': error,
      },
    );
  }
  
  /// APPROVAL_RESPONSE (Client → Server)
  static AdtpMessage approvalResponse(String callId, bool approved) {
    return AdtpMessage(
      type: MessageType.approvalResponse,
      payload: {
        'callId': callId,
        'approved': approved,
      },
    );
  }
}
```

---

### 3. UI Widget Provider (InheritedWidget)

```dart
// lib/widgets/domos_provider.dart

import 'package:flutter/widgets.dart';
import '../src/core/domos_client.dart';

/// Provider pour partager DomOSClient dans le widget tree
class DomOSProvider extends InheritedWidget {
  final DomOSClient client;
  
  const DomOSProvider({
    Key? key,
    required this.client,
    required Widget child,
  }) : super(key: key, child: child);
  
  static DomOSClient of(BuildContext context) {
    final provider = context.dependOnInheritedWidgetOfExactType<DomOSProvider>();
    assert(provider != null, 'No DomOSProvider found in context');
    return provider!.client;
  }
  
  static DomOSClient? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<DomOSProvider>()?.client;
  }
  
  @override
  bool updateShouldNotify(DomOSProvider oldWidget) {
    return client != oldWidget.client;
  }
}
```

---

### 4. Chat Widget Example

```dart
// lib/widgets/domos_chat_widget.dart

import 'package:flutter/material.dart';
import 'domos_provider.dart';
import '../src/core/client_state.dart';

class DomOSChatWidget extends StatefulWidget {
  const DomOSChatWidget({Key? key}) : super(key: key);
  
  @override
  State<DomOSChatWidget> createState() => _DomOSChatWidgetState();
}

class _DomOSChatWidgetState extends State<DomOSChatWidget> {
  final _controller = TextEditingController();
  final _messages = <Message>[];
  
  @override
  void initState() {
    super.initState();
    
    final client = DomOSProvider.of(context);
    
    // Listen agent responses
    client.agentResponseStream.listen((response) {
      setState(() {
        if (response.done) {
          _messages.add(Message(
            text: response.text,
            isUser: false,
          ));
        }
      });
    });
  }
  
  void _sendMessage() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    
    setState(() {
      _messages.add(Message(text: text, isUser: true));
    });
    
    DomOSProvider.of(context).sendText(text);
    _controller.clear();
  }
  
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            itemCount: _messages.length,
            itemBuilder: (context, index) {
              final message = _messages[index];
              return MessageBubble(message: message);
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  decoration: InputDecoration(
                    hintText: 'Type a message...',
                  ),
                  onSubmitted: (_) => _sendMessage(),
                ),
              ),
              IconButton(
                icon: Icon(Icons.send),
                onPressed: _sendMessage,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class Message {
  final String text;
  final bool isUser;
  
  Message({required this.text, required this.isUser});
}

class MessageBubble extends StatelessWidget {
  final Message message;
  
  const MessageBubble({Key? key, required this.message}) : super(key: key);
  
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
    // Créer le client DomOS
    final client = DomOSClient(
      DomOSClientOptions(
        endpoint: 'ws://localhost:3000/domos',
        apiKey: 'pk_demo_local',
        autoReconnect: true,
      ),
    );
    
    // Enregistrer des tools
    client.registerTool(
      ToolDeclaration(
        name: 'get_user_info',
        description: 'Get current user information',
        parameters: {},
      ),
      (args) async {
        return {
          'name': 'John Doe',
          'email': 'john@example.com',
        };
      },
    );
    
    // Connecter au serveur
    client.connect();
    
    return MaterialApp(
      title: 'DomOS Flutter Demo',
      home: DomOSProvider(
        client: client,
        child: ChatScreen(),
      ),
    );
  }
}

class ChatScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final client = DomOSProvider.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: Text('DomOS Chat'),
        actions: [
          StreamBuilder<ClientState>(
            stream: client.stateStream,
            builder: (context, snapshot) {
              final state = snapshot.data ?? ClientState.disconnected;
              return Chip(
                label: Text(state.toString().split('.').last),
                backgroundColor: _getStateColor(state),
              );
            },
          ),
        ],
      ),
      body: DomOSChatWidget(),
    );
  }
  
  Color _getStateColor(ClientState state) {
    switch (state) {
      case ClientState.connected:
      case ClientState.listening:
        return Colors.green;
      case ClientState.connecting:
        return Colors.orange;
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
```

---

## ✅ Checklist d'Implémentation

### Phase 1 : Core Protocol ✅
- [ ] Types ADTP (enums, classes)
- [ ] Messages builders
- [ ] Encoder JSON
- [ ] Decoder JSON
- [ ] Constants (versions)

### Phase 2 : Transport Layer ✅
- [ ] Interface Transport
- [ ] WebSocket implementation
- [ ] WebRTC implementation (optionnel)
- [ ] Auto-reconnect logic

### Phase 3 : Client Core ✅
- [ ] DomOSClient class
- [ ] State management
- [ ] Event streams (Streams<T>)
- [ ] Connection lifecycle
- [ ] Error handling

### Phase 4 : Tool System ✅
- [ ] ToolRegistry
- [ ] Tool execution
- [ ] Auto-sync avec serveur
- [ ] HITL policy

### Phase 5 : Audio Support 🔄
- [ ] Audio recorder (microphone)
- [ ] Audio player (playback)
- [ ] PCM/WAV encoding
- [ ] Base64 conversion

### Phase 6 : UI Widgets 🔄
- [ ] DomOSProvider (InheritedWidget)
- [ ] ChatWidget
- [ ] AudioButton
- [ ] ApprovalDialog
- [ ] LoadingIndicator

### Phase 7 : Tests ✅
- [ ] Unit tests (core logic)
- [ ] Widget tests (UI)
- [ ] Integration tests (E2E)

---

## 🚀 Avantages de cette Architecture

✅ **100% Compatible** : Même protocole ADTP que TypeScript  
✅ **Reactive** : Streams natifs Dart (comme RxDart)  
✅ **Type-safe** : Typage fort Dart + JSON serialization  
✅ **Testable** : Mockito + flutter_test  
✅ **Performant** : Isolates Dart pour background tasks  
✅ **Mobile-ready** : Android + iOS + Web  
✅ **Extensible** : Facile d'ajouter providers (Riverpod, Bloc, etc.)  

---

✅ **Architecture Flutter complète pour DomOS !**

**Voulez-vous que je commence l'implémentation d'une partie spécifique (Protocol, Client Core, ou UI Widgets) ?** 📱🚀
