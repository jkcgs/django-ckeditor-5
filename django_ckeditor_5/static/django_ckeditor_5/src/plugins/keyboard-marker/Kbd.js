import { Plugin } from '@ckeditor/ckeditor5-core/src/plugin';
import { ButtonView } from '@ckeditor/ckeditor5-ui/src/button/buttonview';
import { AttributeCommand } from '@ckeditor/ckeditor5-basic-styles/src/attributecommand';

import kbdIcon from './kbd.svg';

const KBD = 'kbd';

/**
 * The keyboard shortcut feature.
 *
 * Provides a way to semantically mark keyboard shortcuts/hotkeys in the content.
 *
 * It registers the `'kbd'` command, associated keystroke and introduces the
 * `kbd` attribute in the model which renders to the view as a `<kbd>` element.
 *
 * It brings a proper button.
 *
 * Taken from https://github.com/mlewand/ckeditor5-keyboard-marker/tree/1.0.3 (which has no movement since 2020)
 * Simplified in a single Plugin instance. Also fixes imports for CKEditor5 45.0.0+
 *
 * @extends module:core/plugin~Plugin
 */
export default class Kbd extends Plugin {
	/**
	 * @inheritDoc
	 */
	init() {
		const editor = this.editor;
		const t = editor.t;

		// Allow kbd attribute on text nodes.
		editor.model.schema.extend( '$text', { allowAttributes: KBD } );
		editor.model.schema.setAttributeProperties( KBD, {
			isFormatting: true,
			copyOnEnter: true
		} );

		editor.conversion.attributeToElement( {
			model: KBD,
			view: KBD
		} );

		editor.commands.add( KBD, new AttributeCommand( editor, KBD ) );
		editor.keystrokes.set( 'CTRL+ALT+K', KBD );

		editor.ui.componentFactory.add( KBD, locale => {
			const command = editor.commands.get( KBD );
			const view = new ButtonView( locale );

			view.set( {
				label: t( 'Keyboard shortcut' ),
				icon: kbdIcon,
				keystroke: 'CTRL+ALT+K',
				tooltip: true,
				isToggleable: true
			} );

			view.bind( 'isOn', 'isEnabled' ).to( command, 'value', 'isEnabled' );

			// Execute command.
			this.listenTo( view, 'execute', () => {
				editor.execute( KBD );
				editor.editing.view.focus();
			} );

			return view;
		} );
	}

	/**
	 * @inheritDoc
	 */
	static get pluginName() {
		return 'Kbd';
	}
}
