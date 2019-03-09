import { ElementRef } from '@angular/core';

export class DraggableItem {

    // The draggable ID, assigned by the DragDropService.
    id: number;

    // Angular element reference for the component that initiated dragging. Set by
    // the draggable directive.
    el: ElementRef;

    // A newly created element used to represent the actual, visual dragging.
    // Created by the DragDropService.
    dragEl: HTMLElement;

    // Any custom data to associate with this draggable item. It is the draggable's
    // and droppables responsibility to set and use this data.
    data: any;

    // The CSS class to set to the original element being dragged.
    draggedClass: string;

    // The CSS class to set to the cloned element representing the drag.
    draggingClass: string;

    // The original mousedown event that initiated the drag. Set by the draggable
    // directive.
    mouseDownEvent: MouseEvent;

    // The current position of the dragging element. Continuously set by the
    // DragDropService.
    pos: any;

    // The point where the mouse grabs the dragged element, relative to the element's
    // top left corner. Used to make sure the mouse cursor position on the element stays
    // the same throughout the entire drag process.
    grabPoint: any;

    // Number of pixels to move the mouse before drag actually starts.
    startThreshold: number;

    // Is the item actually dragging, i.e. the start drag threshold has been passed.
    isDragging = false;

    // The drag item drop was cancelled, consumer should not acknowledge successful drop.
    cancelled = false;
}
