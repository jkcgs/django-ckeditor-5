import { Plugin } from '@ckeditor/ckeditor5-core/src/plugin';
import { Command } from '@ckeditor/ckeditor5-core/src/command';
import { Widget } from '@ckeditor/ckeditor5-widget/src/widget';
import { toWidget } from '@ckeditor/ckeditor5-widget/src/utils';
import { Dialog } from '@ckeditor/ckeditor5-ui/src/dialog/dialog';
import { View } from '@ckeditor/ckeditor5-ui/src/view';
import { ButtonView } from '@ckeditor/ckeditor5-ui/src/button/buttonview';
import { ListView } from '@ckeditor/ckeditor5-ui/src/list/listview';
import { ListItemView } from '@ckeditor/ckeditor5-ui/src/list/listitemview';
import { SearchTextView } from '@ckeditor/ckeditor5-ui/src/search/text/searchtextview';
import { IconCancel } from '@ckeditor/ckeditor5-icons';


class OfertaBoxFormView extends View {
    constructor(editor) {
        super(editor.locale);
        const locale = editor.locale;
        this.editor = editor;
        this._searchDebounce = null;

        // Atributos observables
        this.set({item: null, results: [], query: '', url: null});

        // -- Views --
        // Lista de resultados
        this.resultsView = new ListView(locale);
        this.resultsView.filter = () => {
            this.query = this.searchView.queryView.fieldView.element?.value ?? ''
            return {resultsCount: 1, totalItemsCount: 1};
        };
        // Search input
        this.searchView = new SearchTextView(locale, {
            queryView: { label: 'Oferta' },
            filteredView: this.resultsView
        });

        // Información de búsqueda
        this.infoView = new View(locale);
        this.infoView.setTemplate({
            tag: 'div',
            attrributes: {class: ['ck-info-text']},
            children: ['']
        });

        // Información de item seleccionado
        this.currentItemView = new View(locale);
        this.currentItemView.setTemplate({
            tag: 'div',
            attrributes: {class: ['ck-info-text']},
            children: ['']
        });

        // Botón cancelar
        this.cancelButton = new ButtonView(locale);
        this.cancelButton.set({
            label: 'Cancelar',
            icon: IconCancel,
            class: 'ck-button-cancel',
            withText: true
        });
        this.cancelButton.delegate('execute').to(this, 'hide');

        // -- Template --
        this.setTemplate({
            tag: 'form',
            attributes: {
                class: ['ck', 'ck-oferta-form'],
                tabindex: '-1'
            },
            children: this.createCollection([
                this.currentItemView,
                this.searchView,
                this.infoView,
                this.resultsView,
                this.cancelButton
            ])
        });

        // Eventos
        this.delegate('change:item').to(this, 'updateInfo');
        this.on('hide', () => editor.plugins.get('Dialog').hide());
        this.on('submit', () => {
            if (this.item) {
                editor.execute('insertOfertaBox', {
                    ofertaId: this.item.id,
                    ofertaName: this.item.name
                });
            }
            this.fire('hide');
            editor.editing.view.focus();
        });
        // Actualiza las vistas de información
        this.on('updateInfo', () => {
            const ciElement = this.currentItemView.element;
            if (ciElement) {
                ciElement.textContent = this.item ? `Selección actual: #${this.item.id} "${this.item.name}"` : '';
            }

            const infoElement = this.infoView.element;
            if (infoElement) {
                infoElement.textContent = !this.query ? 'Ingresa tu búsqueda arriba' : (
                    this.results.length === 0 ? 'Sin resultados' : ''
                );
            }
        });
        // Actualiza la lista de resultados
        this.on('change:results', () => {
            this.resultsView.items.clear();
            this.resultsView.items.addMany(this.results.map(item => {
                const textView = new ButtonView();
                textView.set({
                    label: `${item.id} - ${item.name}`,
                    withText: true
                });
                textView.on('execute', () => {
                    this.item = item;
                    this.fire('submit');
                });

                const listItem = new ListItemView();
                listItem.children.add(textView);
                return listItem;
            }));
            this.fire('updateInfo');
        });
        // Ejecuta la búsqueda al cambiar el texto de consulta
        this.on('change:query', async () => {
            if (this._searchDebounce) {
                clearTimeout(this._searchDebounce);
            }

            if (this.query) {
                this._searchDebounce = setTimeout(async () => {
                    this.infoText = 'Buscando...';

                    let url = this.url + (this.url.includes('?') ? '&' : '?');
                    url += `q=${encodeURIComponent(this.query)}`;

                    this.results = await fetch(url).then(response => {
                        return response.json();
                    }).then(data => {
                        return data.results;
                    });
                }, 300);
            } else {
                this.results = [];
            }
        });
    }

    init(item, url) {
        this.set({query: '', results: [], item, url});
        this.searchView.queryView.reset();
        this.fire('updateInfo');
    }
}

class InsertOfertaBox extends Command {
    execute({ofertaId, ofertaName}) {
        const model = this.editor.model;
        model.change(writer => {
            const ofertaBox = writer.createElement('ofertaBox', {ofertaId, ofertaName});
            model.insertContent(ofertaBox);
            writer.setSelection(ofertaBox, 'on');
        });
    }
    refresh() {
        const model = this.editor.model;
		this.isEnabled = model.schema.findAllowedParent(
            model.document.selection.getFirstPosition(), 'ofertaBox'
        ) !== null;
    }
}

export default class OfertaBox extends Plugin {
    static get requires() {
        return [ Widget, Dialog ];
    }

    init() {
        const editor = this.editor;
        const conversion = editor.conversion;

        editor.model.schema.register('ofertaBox', {
            isObject: true,
            allowIn: '$block',
            allowAttributes: ['ofertaId', 'ofertaName']
        });

        conversion.for('downcast').elementToElement({
            model: 'ofertaBox',
            view: (modelElement, {writer: viewWriter}) => {
                const id = modelElement.getAttribute('ofertaId');
                const name = modelElement.getAttribute('ofertaName');
                const div = viewWriter.createContainerElement('div', {
                    class: 'oferta-box',
                    'data-oferta-id': id,
                    'data-oferta-name': name
                });

                const text = viewWriter.createText(`[Cajita de oferta: #${id} "${name}"]`);
                viewWriter.insert(viewWriter.createPositionAt(div, 0), text);

                return toWidget(div, viewWriter);
            }
        });

        conversion.for('upcast').elementToElement({
            view: {name: 'div', classes: 'oferta-box'},
            model: (viewElement, {writer: modelWriter}) => {
                return modelWriter.createElement('ofertaBox', {
                    ofertaId: viewElement.getAttribute('data-oferta-id'),
                    ofertaName: viewElement.getAttribute('data-oferta-name'),
                });
            }
        });

        const command = new InsertOfertaBox(editor);
        editor.commands.add('insertOfertaBox', command);

        const buttonView = new ButtonView(editor.locale);
        buttonView.set({
            label: editor.t('Oferta'),
            withText: true,
            tooltip: true
        });
        buttonView.bind('isEnabled').to(command);
        buttonView.on('execute', () => this.handler(editor));

        this.formView = new OfertaBoxFormView(editor);
        editor.ui.componentFactory.add('ofertaBox', () => buttonView);
    }

    handler(editor) {
        const url = window.OFERTA_SEARCH_URL;
        if (!url) {
            alert('Función no disponible');
            return;
        }

        const selected = editor.model.document.selection.getSelectedElement();
        let item = (!!selected && selected.is('element', 'ofertaBox')) ? {
            id: selected.getAttribute('ofertaId'),
            name: selected.getAttribute('ofertaName')
        } : null;

        editor.plugins.get('Dialog').show({
            content: this.formView,
            title: `${item ? 'Editar' : 'Insertar'} cajita de oferta`,
            isModal: true
        });
        this.formView.init(item, url);
    }
}
