import {
    Directive,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    OnDestroy
} from '@angular/core';

import { Subject, Subscription, fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DraggableItem } from './draggable-item';
import { DragDropService } from './dragdrop.service';

@Directive({
    selector: '[ddDroppable]'
})
export class DroppableDirective implements OnDestroy {
    ngUnsubscribe: Subject<any> = new Subject<any>();

    private dragging = false;        // Flag representing the dragging state.
    private isDropTarget = false;   // True if the drop occurs on the element.

    private mouseEnterSubscription: Subscription;    // Subscription to mouse enter events from host element.
    private mouseLeaveSubscription: Subscription;    // Subscription to mouse leave events from host element.
    private hoverTimer;                // Timer to delay mouse enter event processing.

    // Emits data needed for the host component to determine if its droppables would accept the draggable. [1]
    @Output('ddDroppableTest') testDrop: EventEmitter<any> = new EventEmitter(false);
    @Input('ddDroppable') droppable: any;    // Droppable data, will be always passed back to host component to identify this droppable.
    @Input('ddAcceptDrop') acceptDrop: boolean = false;    // This must be set by the host component following the testDrop emission. [1]
    @Input('ddDroppableClass') droppableClasses: string = '';    // CSS classes for the droppable when it accepts the drop.
    @Input('ddNotDroppableClass') notDroppableClasses: string = '';    // CSS classes for the droppable when it does not accep drop.
    @Input('ddDroppableHoverDelay') hoverDelay: number = 0;    // Delay in milliseconds before processing mouse enter events. [2]

    @Output('ddOnDrop') drop: EventEmitter<any> = new EventEmitter<DraggableItem>(false); // Emits drag-drop data when a drag stops.


    constructor(
        private el: ElementRef,
        private dragDropService: DragDropService) {
        // Subscribe to the DragDropService observables:
        dragDropService.dragging$
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe((draggable: DraggableItem) => this.onDragging$(draggable));
        dragDropService.dropping$
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe((draggable: DraggableItem) => this.onDropping$(draggable));
    }

    /**
    * Called when dragging begins for a draggable item.
    * @param draggable The item which has just started being dragged.
    */
    onDragging$(draggable: DraggableItem) {
        // Ask host element via a synchronous event whether it accepts drop.
        // Send both draggable and droppable data.
        // It must respond by setting the acceptDrop directive property.
        if (this.testDrop) {
            this.testDrop.emit({ draggable: draggable.data, droppable: this.droppable });
        }

        // Subscribe to mouse enter events on host element.
        this.mouseEnterSubscription = fromEvent(this.el.nativeElement, 'mouseenter')
            .subscribe(
                (event: MouseEvent) => {
                    clearTimeout(this.hoverTimer);
                    this.hoverTimer = setTimeout(() => this.onMouseEnter(event), this.hoverDelay);
                }
            );

        // Subscribe to mouse leave events on host element.
        this.mouseLeaveSubscription = fromEvent(this.el.nativeElement, 'mouseleave')
            .subscribe(
                (event: MouseEvent) => {
                    clearTimeout(this.hoverTimer);
                    this.onMouseLeave(event);
                }
            );

        // Save the dragging state.
        this.dragging = true;
    }

    /**
    * Called when dragging ends for a draggable item.
    * @param draggable The item for which dragging has just ended.
    */
    onDropping$(draggable: DraggableItem) {
        // Emit the drop event, which the host component should be listening to.
        // The draggable data, the droppable object, and the drop target state are sent.
        // If isDropTarget is false, the drop occured outside of the droppable,
        // and the host component should act accordingly.
        if (this.drop) {
            this.drop.emit({
                draggable: draggable.data,
                droppable: this.droppable,
                isDropTarget: this.isDropTarget,
                cancelled: draggable.cancelled
            });
        }

        // Save dragging state.
        this.dragging = false;

        // Unsubscribe from mouse events.
        this.mouseEnterSubscription.unsubscribe();
        this.mouseLeaveSubscription.unsubscribe();

        // Must reset isDropTarget in case mouseexit event did not get a chance to occur.
        this.isDropTarget = false;

        // Reset CSS classes.
        this.removeClasses();
    }


    /**
    * Processes a mouse enter event.
    */
    onMouseEnter(event: MouseEvent) {
        if (!this.dragging) {
            return;
        }

        this.isDropTarget = true;

        if (this.acceptDrop) {
            this.dragDropService.addClasses(this.el.nativeElement, this.droppableClasses);
            this.dragDropService.removeClasses(this.el.nativeElement, this.notDroppableClasses);
        } else {
            this.dragDropService.addClasses(this.el.nativeElement, this.notDroppableClasses);
            this.dragDropService.removeClasses(this.el.nativeElement, this.droppableClasses);
        }

    }

    /**
    * Processes a mouse leave event.
    */
    onMouseLeave(event: MouseEvent) {
        if (!this.dragging) {
            return;
        }

        this.isDropTarget = false;
        this.removeClasses();
    }

    /**
    * Helper function to remove all droppable CSS classes.
    */
    removeClasses() {
        this.dragDropService.removeClasses(this.el.nativeElement, this.droppableClasses);
        this.dragDropService.removeClasses(this.el.nativeElement, this.notDroppableClasses);
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

}

/**
* FOOTNOTES:
*
*    [1] It is the host component's decision to accept the drop of a certain draggable object
*        on its droppables. This is accomplished like this:
*        1. When a drag starts, the droppable directive emits a testDrop event, to which
*           the host component must listen to. The event is SYNCHRONOUS.
*        2. In that event handler, the host component check any conditions it wishes,
*            and sets the directive's acceptDrop property.
*    [2] When moving the mouse quickly over a bunch o droppables, delaying the
*        mouse enter events reduces potential flicker and jerking with changing
*        droppable CSS classes. This way, the user must pause on top of the
*        droppable for the specified duration before mouse enter event is processed.
*/
