import {
    Injectable,
    ElementRef
} from '@angular/core';

import { Subject, fromEvent, Subscription } from 'rxjs';
import { sampleTime, debounceTime, first } from 'rxjs/operators';

import { DraggableItem } from './draggable-item';

@Injectable()
export class DragDropService {

    static readonly DRAG_Z_INDEX: string = '100000';

    // An array of registered draggable objects. It is an array for future-proofing,
    // to allow implementation of multi-element drag and drop, if it ever becomes
    // necessary.
    private _draggables: Array<DraggableItem> = [];
    get draggables() {
        return this._draggables;
    }

    // Flag representing the dragging state. If true, something is being dragged.
    private _dragging: Subject<DraggableItem> = new Subject();
    dragging$ = this._dragging.asObservable();

    // Flag representing the dragging state. If true, something is being dropped.
    private _dropping: Subject<DraggableItem> = new Subject();
    dropping$ = this._dropping.asObservable();

    // Last mouse cursor position.
    private lastMousePos: any = {};
    // Last mouse position displacement, calculated based on current position and lastMousePos.
    // Used to avoid processing when onMouseMove is triggered without any movement actually
    // occurring.
    private lastDisplacement: any = {};

    // The viewport bounding rect derived from the _vieportElement (see below).
    private _viewportRect: ClientRect;

    // The element that constitutes the viewport in which dragging occurs.
    private _viewportElement: HTMLElement;
    get viewportElement() {
        return this._viewportElement;
    }
    set viewportElement(selector: any) {
        this._viewportElement = document.querySelector(selector) || document.body;
        this._viewportRect = this._viewportElement.getBoundingClientRect();
    }

    // Subscribe to vieport element mouse move event to track dragging.
    private viewportMouseMoveSubscription: Subscription;
    // Subscribe to viewport element resize event to recalculate drag parameters.
    private viewportResizeSubscription: Subscription;
    // Save the original viewport cursor.
    private viewportCursor: string;

    private scrollXInterval = null;
    private scrollYInterval = null;
    private scrollIntervalDelay = 0;

    constructor() {
        this.viewportElement = 'body';
    }

    /**
    * Activates the drag-drop functionality:
    *    - creates and styles the draggable elements
    *    - sets the dragging state flag
    *    - attaches required event listeners.
    */
    activate() {
        this.dragStart();

        // Subscription that need to be saved in order to unsubscribe on drag deactivation.

        this.viewportMouseMoveSubscription = fromEvent(this._viewportElement, 'mousemove')
            .pipe(sampleTime(16))
            .subscribe((event: MouseEvent) => {
                this.onViewportMouseMove(event);
            });

        this.viewportResizeSubscription = fromEvent(window, 'resize')
            .pipe(debounceTime(100))
            .subscribe(() => {
                this._viewportRect = this._viewportElement.getBoundingClientRect();
            });

        // Subscriptions we don't need to save, since we call first(), which automatically
        // unsubscribes after the first emission.

        // Observe mouseup to end drag:
        fromEvent(this._viewportElement, 'mouseup')
            .pipe(first())
            .subscribe((event: MouseEvent) => {
                this.onVieportMouseUp(event);
            });

        // Observe mouse down (in fact, RIGHT mouse button, since the left is
        // going to be pressed by design) during drag, to abort.
        fromEvent(this._viewportElement, 'mousedown')
            .pipe(first())
            .subscribe(() => {
                this.deactivate(true);
            });

        // Observe mouseup on the window object, for events outside the vieport.
        fromEvent(window, 'mouseup')
            .pipe(first())
            .subscribe(() => {
                this.deactivate(true);
            });

        // Observe keydown on the window object, deactivate if any key is pressed.
        fromEvent(window, 'keydown')
            .pipe(first())
            .subscribe(() => {
                this.deactivate(true);
            });


        // Observe blur on the window object, deactivate if window loses focus.
        fromEvent(window, 'blur')
            .pipe(first())
            .subscribe(() => {
                this.deactivate(true);
            });
    }

    /**
    * Deactivates the drag-drop functionality:
    *    - destroys the draggable elements via dragStop()
    *    - unsets the dragging state flag
    *    - removes the event listeners
    *    - clears the draggables array
    */
    deactivate(cancelled?: boolean) {

        this.viewportMouseMoveSubscription.unsubscribe();
        this.viewportResizeSubscription.unsubscribe();

        this.dragStop(cancelled);
        this._draggables = [];

        // Clear any active scroll timer.
        this.clearScrollIntervals();
    }

    /**
    * Initiates the drag process.
    */
    dragStart() {
        this._viewportRect = this._viewportElement.getBoundingClientRect();
        this.lastMousePos = {};
        this.lastDisplacement = {};
    }

    /**
    * Stops all dragging.
    */
    dragStop(cancelled?: boolean) {

        for (let i = 0; i < this._draggables.length; i++) {
            this.endItemDrag(this._draggables[i], cancelled);
            this.removeClasses(this._draggables[i].el.nativeElement, this._draggables[i].draggedClass);
            this.destroyDraggableElement(this._draggables[i]);
        }

        // Restore the original viewport cursor property.
        this._viewportElement.style.cursor = this.viewportCursor;
    }

    /**
    * Begins a draggable item drag:
   *     - initiates creation of the actual dragging DOM element
    *    - sets the draggable item isDragging to true.
    *    - reveals the dragging process by making the dragging element visible and setting
    *    the draggedClass to the dragged element.
    * @param draggable The draggable item to reveal the drag process for.
    */
    beginItemDrag(draggable: DraggableItem) {

        if (draggable.isDragging) {
            return;
        }

        // Style the viewport cursor, otherwise the drag cursor will vary due to
        // pointer-events being none on the draggable element.
        this.viewportCursor = this._viewportElement.style.cursor;
        this._viewportElement.style.cursor = 'pointer';
        this._viewportElement.style.cursor = 'grabbing';
        this._viewportElement.style.cursor = '-webkit-grabbing';

        // Create the actual DOM elements to represent drag.
        this.createDraggableElement(draggable);

        draggable.isDragging = true;
        draggable.dragEl.style.visibility = 'visible';
        this.addClasses(draggable.el.nativeElement, draggable.draggedClass);

        this._dragging.next(draggable);

    }

    /**
    * Ends a draggable item drag:
    *    - sets the draggable item isDragging to false
    *    - emits a dropping event with the draggable item as parameter
    * @param draggable The draggable item to reveal the drag process for.
    */
    endItemDrag(draggable: DraggableItem, cancelled?: boolean) {

        if (!draggable.isDragging) {
            return;
        }

        draggable.isDragging = false;
        draggable.cancelled = cancelled;

        this._dropping.next(draggable);
    }

    /**
    * Registers a draggable object. This is the function the drag directive calls.
    * @param el The Angular DOM element being dragged.
    * @param data Any custom data to associate with the dragged element.
    * @param draggingClass CSS class to set to the dragging element representation.
    * @param draggedClass CSS class to set to the original element being dragged while drag is in progress.
    * @return The index in the draggables array uniquely identifying the element to drag.
    * This can be used in the calling directive to obtain the drag object.
    */
    registerDraggable(
        event: MouseEvent,
        el: ElementRef,
        data?: any,
        containerSelector?: string,
        draggingClass?: string,
        draggedClass?: string,
        startThreshold?: number) {

        this.viewportElement = containerSelector;

        const draggable = new DraggableItem();

        draggable.mouseDownEvent = event;
        draggable.el = el;
        draggable.data = data;
        draggable.draggingClass = draggingClass;
        draggable.draggedClass = draggedClass;
        draggable.startThreshold = startThreshold;

        this._draggables.push(draggable);

        this.activate();
    }

    /**
    * Creates the actual DOM element to represent dragging.
    * @param draggable An object from the draggables array.
    */
    createDraggableElement(draggable: DraggableItem) {
        const elRect = draggable.el.nativeElement.getBoundingClientRect();
        const overlay: any = document.createElement('div');

        // Initialize draggable item position.
        draggable.pos = { x: elRect.left, y: elRect.top };

        // Initialize the coordinates of the point on the draggable item where
        // mouse cursor is when first grabbing the item.
        draggable.grabPoint = {
            x: draggable.mouseDownEvent.clientX - draggable.pos.x,
            y: draggable.mouseDownEvent.clientY - draggable.pos.y
        };

        // Clone the original to obtain the draggable item DOM node.
        draggable.dragEl = draggable.el.nativeElement.cloneNode(true);

        // Style the draggable item node.
        this.addClasses(draggable.dragEl, draggable.draggingClass);

        // Add specifis styles. Make the node hidden until the
        // start drag threshold is passed (see this.beginItemDrag() function).
        draggable.dragEl.style.position = 'fixed';
        draggable.dragEl.style.left = draggable.pos.x + 'px';
        draggable.dragEl.style.top = draggable.pos.y + 'px';
        draggable.dragEl.style.width = elRect.width + 'px';
        draggable.dragEl.style.height = elRect.height + 'px';
        draggable.dragEl.style.zIndex = DragDropService.DRAG_Z_INDEX;
        draggable.dragEl.style.visibility = 'hidden';
        draggable.dragEl.style.pointerEvents = 'none'; // This is needed to pass-through mouse events to underlying drop containers.

        // Create an overlay element to cover all the underlying content.
        // Does not have an actual use at this time, but may have in a future
        // implementation.
        overlay.style.position = 'absolute';
        overlay.style.left = '0px';
        overlay.style.top = '0px';
        overlay.style.width = elRect.width + 'px';
        overlay.style.height = elRect.height + 'px';

        // Add the overlay node to the draggable item node.
        draggable.dragEl.appendChild(overlay);

        // Add the draggable item node to the vieport element.
        this._viewportElement.appendChild(draggable.dragEl);
    }

    /**
    * Determines if the mouse is outside the vieport in any direction.
    * @param mouseX The abscissa coordinate.
    * @param mouseY The ordinate coordinate.
    * @return True if mouse cursor is outside the viewport, false otherwise.
    */
    isMouseOutsideViewport(mouseX: number, mouseY: number): boolean {
        return mouseX < this._viewportRect.left ||
            mouseX > this._viewportRect.right ||
            mouseY < this._viewportRect.top ||
            mouseY > this._viewportRect.bottom;
    }

    /**
    * Performs the actual movement of a draggable element.
    * @param draggable - The draggable item.
    * @param left - The abscisa coordinate, straight from the mousemove event.
    * @param top - The ordinate coordinate, straight from the mousemove event.
    */
    moveDraggableElement(draggable: DraggableItem, left: number, top: number) {

        // Adjust of the grab point offset.
        draggable.pos.x = left - draggable.grabPoint.x;
        draggable.pos.y = top - draggable.grabPoint.y;

        // Actually move the element.
        draggable.dragEl.style.left = draggable.pos.x + 'px';
        draggable.dragEl.style.top = draggable.pos.y + 'px';
    }

    /**
    * Destroys the cloned DOM element that represents dragging.
    * @param draggable An object from the draggable array.
    */
    destroyDraggableElement(draggable: DraggableItem) {
        if (draggable.dragEl) {
            this._viewportElement.removeChild(draggable.dragEl);
            delete draggable.dragEl;
        }
    }

    /**
    * Utility function to add multiple CSS classes at once, given a space-separated
    * list of class names.
    * @param el The element to add CSS classes to.
    * @param classes A space-separated string of CSS classes.
    */
    addClasses(el: HTMLElement, classes: string) {
        if (!el || !classes) {
            return;
        }

        const classArray = classes.split(' ');

        for (let i = 0; i < classArray.length; i++) {
            el.classList.add(classArray[i]);
        }
    }

    /**
    * Utility function to remove multiple CSS classes at once, given a space-separated
    * list of class names.
    * @param el The elemen to remove CSS classes from.
    * @param classes A space-separated string of CSS classes.
    */
    removeClasses(el: HTMLElement, classes: string) {
        if (!el || !classes) {
            return;
        }

        const classArray = classes.split(' ');

        for (let i = 0; i < classArray.length; i++) {
            el.classList.remove(classArray[i]);
        }
    }

    clearScrollIntervals() {
        clearInterval(this.scrollXInterval);
        clearInterval(this.scrollYInterval);
    }

    /**
    * Scrolls the vieport as needed, given a set of coordinates, attempting to
    * keep them in view.
    * TODO: needs more testing and work.
    * @param x The abscisa coordinate.
    * @param y The ordonate coordinate.
    */
    scrollViewportAsNeeded(x: number, y: number) {
        const bottomBias = 3;
        const rightBias = 2;

        this.clearScrollIntervals();

        if (x <= Math.round(this._viewportRect.left) && this._viewportElement.scrollLeft > 0) {
            this.scrollXInterval = setInterval(() => { this._viewportElement.scrollLeft--; }, this.scrollIntervalDelay);
        } else if (x >= Math.round(this._viewportRect.right - rightBias)) {
            this.scrollXInterval = setInterval(() => { this._viewportElement.scrollLeft++; }, this.scrollIntervalDelay);
        }


        if (y <= Math.round(this._viewportRect.top) && this._viewportElement.scrollTop > 0) {
            this.scrollYInterval = setInterval(() => { this._viewportElement.scrollTop-- }, this.scrollIntervalDelay);
        } else if (y >= Math.round(this._viewportRect.bottom - bottomBias)) {
            this.scrollYInterval = setInterval(() => { this._viewportElement.scrollTop++ }, this.scrollIntervalDelay);
        }
    }

    /**
    * Checks if a draggable has passed its drag start threshold in pixels.
    * @param draggable The draggable item to check.
    * @param x The abscisa coordinate to check against.
    * @param y The ordinate coordinate to check against.
    * @return True if threshold has been passed, false otherwise.
    */
    startThresholdPassed(draggable: DraggableItem, x: number, y: number): boolean {
        return Math.abs(draggable.mouseDownEvent.clientX - x) >= draggable.startThreshold ||
            Math.abs(draggable.mouseDownEvent.clientY - y) >= draggable.startThreshold;
    }

    /**
    * Handles vieport mouse move events.
    * @param event A mouse move  event.
    */
    onViewportMouseMove(event: MouseEvent) {
        // Attempt to scroll the vieport so as to keep the current mouse coordinates in view.
        this.scrollViewportAsNeeded(event.clientX, event.clientY);

        // If mouse position ends up outside the viewport, despite scrolling, abort.
        if (this.isMouseOutsideViewport(event.clientX, event.clientY)) {
            return;
        }

        // Calculate mouse displacement and update saved last mouse position.
        this.lastDisplacement.x = this.lastMousePos.x - event.clientX || 0;
        this.lastDisplacement.y = this.lastMousePos.y - event.clientY || 0;

        this.lastMousePos.x = event.clientX;
        this.lastMousePos.y = event.clientY;

        // If there's no actual mouse move (but the mousemove event does get triggered),
        // abort.
        if (this.lastDisplacement.x === 0 && this.lastDisplacement.y === 0) {
            return;
        }

        // Move all the registered draggable items.
        for (let i = 0; i < this._draggables.length; i++) {
            if (this.startThresholdPassed(this._draggables[i], event.clientX, event.clientY)) {
                this.beginItemDrag(this._draggables[i]);
                this.moveDraggableElement(this._draggables[i], event.clientX, event.clientY);
            }
        }
    }

    /**
    * Handles document mouse up events.
    * @param event The mouse move event.
    */
    onVieportMouseUp(event: MouseEvent) {
        this.deactivate();
    }
}
