import { TestBed, async } from '@angular/core/testing';

import { DragDropService } from './dragdrop.service';
import { ElementRef, DebugElement } from '@angular/core';
import { DraggableItem } from 'dragdrop/dragdrop';

describe('DragdropService', () => {
    let service: DragDropService;
    let container: HTMLElement;
    let containerRef: DebugElement;
    let dragTarget: HTMLElement;
    let dragRef: DebugElement;
    let dropTarget: HTMLElement;
    let dropRef: DebugElement;

    beforeEach(async(() => {
        const oldContainer: HTMLElement = document.getElementById('testContainer');
        if (oldContainer) {
            document.body.removeChild(oldContainer);
        }

        container = document.createElement('div');
        container.setAttribute('id', 'testContainer');
        container.style.width = '300px';
        container.style.height = '300px';
        containerRef = new DebugElement(container, document.body, null);

        document.body.appendChild(container);

        dragTarget = document.createElement('div');
        dragTarget.setAttribute('id', 'dragTarget');
        dragRef = new DebugElement(dragTarget, container, null);

        container.appendChild(dragTarget);

        dropTarget = document.createElement('div');
        dropTarget.setAttribute('id', 'dropTarget');
        dropRef = new DebugElement(dropTarget, container, null);

        container.appendChild(dropTarget);
    }));

    beforeEach(() => TestBed.configureTestingModule({
        providers: [DragDropService]
    }));

    beforeEach(async(() => {
        service = TestBed.get(DragDropService);
        service.viewportElement = '#testContainer';
    }));

    it('instantiates', () => {
        expect(service).toBeTruthy();
    });

    it('sets viewport element', () => {
        expect(service.viewportElement).toBe(container);
    });

    it('sets viewport element', () => {
        expect(service.viewportElement).toBe(container);
    });

    it('registers draggable', () => {

        service.dragging$.subscribe((el: DraggableItem) => {
            console.log(el);
        });

        service.registerDraggable(<any>{ target: dragTarget }, dragRef, {}, '#testContainer', '', '', 0);

        containerRef.triggerEventHandler('mousemove', { type: 'mousemove', target: container, clientX: 100, clientY: 100 });
    });
});
