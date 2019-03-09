import { Directive, ElementRef, HostListener, Input } from '@angular/core';

import { DragDropService } from './dragdrop.service';

@Directive({
    selector: '[ddDraggable]'
})
export class DraggableDirective {

    @Input('ddContainerSelector') containerSelector: string; // A DOM selector for the container.
    @Input('ddDraggable') data: any;    // Any custom data to associate with the draggable object.
    @Input('ddCanDrag') canDrag: boolean = true;    // Drag can happen, default is true.
    @Input('ddDraggedClass') draggedClasses: string = '';    // CSS classes to apply to the drag source element.
    @Input('ddDraggingClass') draggingClasses: string = '';  // CSS classes to apply to the dragging element. [1]
    @Input('ddDragStartThreshold') dragStartThreshold: number = 10;  // Number of pixels to allow before actually initiating the drag process.

    constructor(private el: ElementRef,
        private dragDropService: DragDropService) {
    }


    /**
    * Listens to mouse down events on host element and initiates the drag process.
    * Prevents default behavior to avoid text selection during drag.
    */
    @HostListener('mousedown', ['$event']) onMouseDown(event: MouseEvent) {
        // If event not triggered by MAIN (usually LEFT) mouse button, ignore it.
        if (event.button !== 0) {
            return;
        }

        if (!this.canDrag) {
            return;
        }

        // Since mouse down event is stopped (otherwise drag won't work),
        // dispatch a drag start event instead. Listen to it instead of the mouse down
        // when you need to capture it on the host element and its ancestors.
        document.dispatchEvent(new CustomEvent('dragstart'));

        this.dragDropService.registerDraggable(
            event,
            this.el,
            this.data,
            this.containerSelector,
            this.draggingClasses,
            this.draggedClasses,
            this.dragStartThreshold);

        event.preventDefault();
        event.stopPropagation();
    }


    /**
    * Listens to the default dragstart event and prevents the default behavior.
    */
    @HostListener('dragstart', ['$event']) onDragStart(event: any) {
        event.preventDefault();
    }

}

/**
* FOOTNOTES:
*
*    [1] The dragging element is the floating element representing the drag object,
*        i.e. the "ghost" element.
*
*/
