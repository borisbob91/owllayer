# Issue #15 : Widget storefront WooCommerce non rendu car enqueue JS trop tard dans wp_footer

**Statut** : 🔴 Ouvert  
**Priorite** : 🔴 Bloquant  
**Domaine** : woocommerce  
**Porteur** : @BorisBob  
**Date** : 2026-04-06  

---

## Resume

Le plugin WooCommerce charge bien sa page admin, mais cote storefront le widget DomOS ne s'affiche pas et aucun JS client n'est execute. Le bundle storefront et son inline init sont actuellement declenches depuis un callback `wp_footer` dans [domos/packages/woocommerce/plugin/domos-woocommerce.php](domos/packages/woocommerce/plugin/domos-woocommerce.php#L75-L119), ce qui les fait arriver trop tard dans le cycle de rendu WordPress.

Impact utilisateur : le parcours storefront reste sans widget ni initialisation DomOS alors que la configuration admin semble saine, ce qui masque le probleme tant qu'on ne verifie pas le HTML rendu cote visiteur.

---

## Reproduction

### Conditions

- Version affectee : etat courant de [domos/packages/woocommerce](domos/packages/woocommerce) au 2026-04-06
- Environnement : WordPress avec WooCommerce actif, plugin DomOS WooCommerce actif
- Configuration : cle API renseignee dans l'admin DomOS WooCommerce, theme storefront appelant `wp_footer()` normalement

### Scenario pas-a-pas

1. Activer le plugin DomOS WooCommerce et configurer une cle API valide dans l'admin.
2. Verifier que la page admin du plugin se charge normalement.
3. Ouvrir une page storefront cote visiteur.
4. Inspecter le HTML final du footer et verifier la presence des scripts lies au plugin.
5. Constater que le callback construit bien le contexte storefront dans [domos/packages/woocommerce/plugin/domos-woocommerce.php](domos/packages/woocommerce/plugin/domos-woocommerce.php#L79-L108), mais que ni le tag script du bundle `assets/domos-woocommerce.min.js` ni l'inline init `DomOSWoo.init(...)` ne sont rendus cote utilisateur.
6. → Bug observe : le widget/plugin ne s'affiche pas sur le storefront et aucun JS DomOS storefront n'est appele, alors que l'admin reste fonctionnel.

---

## Analyse technique

### Cause racine

Le storefront enqueue le bundle et l'inline init au sein d'un callback `wp_footer` en priorite 20, au lieu de les enregistrer avant le moment ou WordPress imprime les scripts de footer.

Fichier : [domos/packages/woocommerce/plugin/domos-woocommerce.php](domos/packages/woocommerce/plugin/domos-woocommerce.php#L75-L119)  
Lignes : 75, 109, 116  
Code :

```php
add_action( 'wp_footer', function () use ( $settings ) {
    $context_builder = new Domos_Woo_Context_Builder( $settings );
    $context         = $context_builder->build();

    echo '<script id="domos-woo-context" type="application/json">'
        . wp_json_encode( $context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES )
        . '</script>' . "\n";

    wp_enqueue_script(
        'domos-woocommerce',
        DOMOS_WOO_PLUGIN_URL . 'assets/domos-woocommerce.min.js',
        [],
        DOMOS_WOO_VERSION,
        true
    );
    wp_add_inline_script(
        'domos-woocommerce',
        'DomOSWoo.init(' . wp_json_encode( $config, JSON_UNESCAPED_SLASHES ) . ');'
    );
}, 20 );
```

Element de contexte confirme : [domos/packages/woocommerce/plugin/includes/class-sw-registrar.php](domos/packages/woocommerce/plugin/includes/class-sw-registrar.php#L18) utilise aussi `wp_footer`, mais uniquement pour un petit script inline de service worker en priorite 5. Ce fichier n'est pas la source du bug storefront.

### Pourquoi c'est un bug (et pas un comportement attendu)

Le handle storefront `domos-woocommerce` est enqueue au moment meme ou WordPress est deja en train d'imprimer les footer scripts via `wp_footer`. A cette etape, le bundle n'entre plus dans la sortie HTML de la requete courante. Comme `wp_add_inline_script` depend de ce meme handle, l'init `DomOSWoo.init(...)` n'est pas rendu non plus.

Le comportement observe est donc coherent avec un enqueue trop tardif, pas avec un probleme de bundle ou de configuration admin. L'admin continue de fonctionner parce qu'elle suit un chemin distinct, alors que le storefront depend entierement de cette injection front-end.

---

## Solution

### Approche retenue

**AVANT**

Le contexte storefront, le `wp_enqueue_script(...)` du bundle et le `wp_add_inline_script(...)` d'initialisation sont tous executes dans un callback `wp_footer` en priorite 20.

**APRES**

Le fix devra deplacer l'enqueue storefront et l'attachement de l'inline init vers un hook front-end execute avant l'impression des footer scripts. Le rendu du bloc JSON `#domos-woo-context` pourra rester sur un point d'injection HTML adapte si necessaire, mais il ne devra plus porter l'enqueue du bundle.

**POURQUOI**

Le correctif doit garantir que le bundle `domos-woocommerce` et son init sont deja enregistres quand WordPress imprime les scripts de footer, sans toucher au flux admin ni elargir le scope hors du domaine `woocommerce`.

### Fichiers qui seront modifies

| Fichier | AVANT | APRES | POURQUOI | Risque |
| --- | --- | --- | --- | --- |
| [domos/packages/woocommerce/plugin/domos-woocommerce.php](domos/packages/woocommerce/plugin/domos-woocommerce.php) | le storefront construit le contexte JSON puis appelle `wp_enqueue_script(...)` et `wp_add_inline_script(...)` depuis `wp_footer` priorite 20 | separer l'injection HTML du contexte et l'enqueue/init JS pour que le handle soit prepare avant l'impression des footer scripts | corriger la cause racine dans le fichier unique qui orchestre aujourd'hui l'injection storefront | Faible |

> ⚠️ Tout fichier modifie en PR qui ne figure pas dans ce tableau est un motif de refus.

### Ce qui NE sera PAS modifie

- [domos/packages/woocommerce/plugin/includes/class-sw-registrar.php](domos/packages/woocommerce/plugin/includes/class-sw-registrar.php) : hors scope, ne gere que le petit inline script de service worker
- [domos/packages/woocommerce/plugin/assets](domos/packages/woocommerce/plugin/assets) : hors scope, le bug documente porte sur le timing d'injection WordPress, pas sur le contenu du bundle genere
- [domos/packages/woocommerce/src](domos/packages/woocommerce/src) : hors scope, aucun changement SDK ou build package n'est necessaire pour corriger ce defaut d'injection storefront
- tout autre fichier hors [domos/packages/woocommerce/plugin/domos-woocommerce.php](domos/packages/woocommerce/plugin/domos-woocommerce.php)

---

## Tests

- [ ] verification manuelle : une page storefront rend bien le tag script du bundle `domos-woocommerce` cote HTML final
- [ ] verification manuelle : `DomOSWoo.init(...)` est present dans le HTML final du storefront apres correction
- [ ] verification manuelle : le widget DomOS s'affiche et s'initialise cote visiteur
- [ ] verification manuelle : la page admin WooCommerce DomOS reste fonctionnelle
- [ ] `pnpm --filter @domos/woocommerce build` passe
- [ ] `pnpm --filter @domos/woocommerce test` ne regresse pas