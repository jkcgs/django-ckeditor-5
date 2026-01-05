import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import Image from '@ckeditor/ckeditor5-image/src/image';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';

import btnIcon from './add-image.svg';

export default class FilerImagePicker extends Plugin {
	/**
	 * @inheritDoc
	 */
	static get pluginName() {
		return 'FilerImagePicker';
	}

    static get requires() {
		return [ Image ];
	}

    init() {
		const editor = this.editor;
		const t = editor.t;
        const base = editor.sourceElement;

		editor.ui.componentFactory.add( 'filerImagePicker', locale => {
			const button = new ButtonView( locale );

			button.set({
				label: t( 'Add image' ),
				icon: btnIcon,
				keystroke: 'CTRL+ALT+P',
				tooltip: true
			});

			button.on('execute', () => {
                window.open(
                    `${base.dataset.filerUrl}?_pick=file&_popup=1&_to_field=${base.name}`,
                    'cke5ip_' + base.name
                );
            });

			return button;
		});
	}
}

window.addEventListener('DOMContentLoaded', function() {
    let prevHandler = window.dismissRelatedImageLookupPopup || function(){};
    window.dismissRelatedImageLookupPopup = function(
        win,
        chosenId,
        chosenThumbnailUrl,
        chosenDescriptionTxt,
        chosenAdminChangeUrl
    ) {
        if (!win.name.startsWith('cke5ip_')) {
            prevHandler(win, chosenId, chosenThumbnailUrl, chosenDescriptionTxt, chosenAdminChangeUrl);
            return;
        }

        let fieldName = win.name.substring(7);
        let editor = document.querySelector(`.field-${fieldName} .ck-content`).ckeditorInstance;

        editor.model.change( writer => {
            const imageGetUrl = editor.sourceElement.dataset.imageBaseUrl.replace('000', chosenId);
            fetch(imageGetUrl).then(resp => {
                return resp.json()
            }).then(data => {
                const imageBlock = writer.createElement('imageBlock', {src: data.url});
			    editor.model.insertObject(imageBlock);
            }).catch(error => {
                console.error(error);
                alert('No fue posible cargar la imagen');
            })
		});

        win.close();
        window.focus();
    }
});