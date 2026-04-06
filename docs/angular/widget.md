# Widget - @domos/angular

`DomOSWidgetComponent` est la surface widget officielle du SDK Angular.

C'est le chemin le plus court pour ajouter une interface DomOS complete a une application Angular : chat texte, mode voix, etat agent, transitions visuelles et boucle HITL avec modal d'approbation integree.

Le widget est utile si vous voulez aller vite sans reconstruire vous-meme toute la couche conversationnelle.

## Ce que le widget gere

Le composant gere deja :

- la connexion au client DomOS
- le mode texte et le mode audio
- l'affichage de l'etat agent (`listening`, `thinking`, `speaking`, etc.)
- l'historique local des messages texte
- l'envoi de texte a l'agent
- la capture audio et la lecture audio
- la bascule audio <-> texte si elle est autorisee
- la boucle HITL via `DomOSApprovalModalComponent`
- le style du widget a partir des themes et labels DomOS

## Deux modes d'integration

### 1. Fournir `endpoint` et `apiKey`

Le widget cree et possede son propre client DomOS.

```ts
import { Component } from '@angular/core';
import { DomOSWidgetComponent } from '@domos/angular';

@Component({
  standalone: true,
  imports: [DomOSWidgetComponent],
  template: `
    <domos-widget
      [endpoint]="'ws://localhost:4001/domos'"
      [apiKey]="'pk_dev_123'"
      [config]="{
        agentName: 'Milo',
        agentTitle: 'Assistant produit',
        mode: 'text'
      }"
    />
  `,
})
export class ShellComponent {}
```

### 2. Fournir un `client`

Le widget reutilise un client deja instancie ailleurs dans l'application.

```ts
<domos-widget [client]="domosClient" [config]="widgetConfig" />
```

Ce mode est utile si vous voulez partager exactement la meme session, les memes plugins et le meme transport que d'autres surfaces DomOS de l'application.

## Inputs publics

| Input | Description |
| --- | --- |
| `apiKey` | Cle publique DomOS. Utilisee si aucun client n'est fourni |
| `endpoint` | Endpoint WebSocket DomOS. Utilise si aucun client n'est fourni |
| `client` | Instance `DomOSClient` existante a reutiliser |
| `config` | Configuration widget `WidgetConfig` |
| `showApprovalModal` | Active ou non la modal HITL integree |

## Ce que contient `config`

Le widget fusionne votre config avec :

- `DEFAULT_WIDGET_CONFIG`
- `DEFAULT_THEME`
- `DEFAULT_LABELS`

Cela permet de surcharger seulement ce qui vous interesse sans devoir redefinir toute la configuration.

### Exemple de config riche

```ts
widgetConfig = {
  agentName: 'Louise',
  agentTitle: 'Assistante marketplace',
  mode: 'audio',
  allowModeSwitch: true,
  position: 'bottom-left',
  stylePreset: 'glass',
  theme: {
    accentColor: '#ffcf8b',
    panelBackground: '#173845',
    textColor: '#f6efe3',
  },
  labels: {
    callToAction: 'Parler a Louise',
    subtitle: 'Recherche, filtres, favoris',
    textPlaceholder: 'Ecrivez votre demande...',
  },
};
```

## Etats derives importants

En interne, le widget derive plusieurs etats utiles :

- `visualState` pour piloter la surface visuelle
- `statusLabel` pour les libelles d'etat
- `isLive` pour savoir si la session peut recevoir des interactions
- `agentDisplay` pour l'affichage nom + titre
- `pendingApproval` pour les demandes HITL

L'interet de ces etats derives est de garder un comportement coherent entre mode texte, mode audio et UI de validation.

## HITL integre

Le widget monte `DomOSApprovalModalComponent` et gere la boucle d'approbation directement. Si un tool sensible demande une validation humaine, le widget peut afficher la modal et resoudre l'action selon l'approbation ou le refus.

Cela fait du widget un bon point d'entree pour une integration rapide dans une application qui ne veut pas encore construire sa propre experience HITL.

## Contraintes pratiques

- si vous ne fournissez pas `client`, alors `endpoint` et `apiKey` deviennent requis
- le widget gere son propre cycle de vie client seulement s'il possede lui-meme ce client
- le mode audio depend bien sur des permissions navigateur et du support micro/audio
- un widget bien configure ne remplace pas un bon contrat de tools et de contexte dans l'application

Le point important est la : le widget n'est pas la couche d'intelligence. Il est la couche d'interaction. Si vos tools sont vagues et votre contexte pauvre, le widget ne compensera pas cette faiblesse.

## Quand utiliser le widget

Utilisez `DomOSWidgetComponent` si :

- vous voulez integrer DomOS vite
- vous avez besoin d'une interface texte/voix prete a l'emploi
- vous voulez beneficier du HITL integre
- vous ne voulez pas construire tout le pipeline visuel vous-meme

Construisez plutot une UI maison si :

- vous avez de fortes contraintes design ou layout
- vous voulez une orchestration UI tres specifique
- vous voulez exposer l'etat agent dans plusieurs zones produit specialisees

## Conseils de produit

Dans une vraie application Angular, le widget fonctionne mieux si :

- les pages exposent un contexte riche et stable
- les tools sont nommes avec un vocabulaire metier clair
- les actions risquee sont marquees `high` ou `critical`
- la navigation et l'etat UI standard passent par les primitives dediees du SDK

En pratique, le widget donne une surface visible. La qualite de l'experience depend ensuite surtout de la qualite du contrat que votre application fournit a l'agent.
