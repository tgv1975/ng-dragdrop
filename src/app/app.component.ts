import { Component } from '@angular/core';
import { DragDropService } from 'dragdrop';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {
    title = 'dragdrop-lib';
    canDrag = false;

    constructor(dragDropService: DragDropService) {
        document.onmouseup = () => this.canDrag = false;

        dragDropService.activate$
            .subscribe(() => console.log('Drag activated.'));


        dragDropService.deactivate$
            .subscribe(() => console.log('Drag de-activated.'));

    }

    handleMouseDown() {
        this.canDrag = true;
    }

    handleMouseUp() {
        this.canDrag = false;
    }

    onDroppableTest($event) {
        console.log('Droppable test: ', $event);
        return true;
    }

    onDragDrop($event) {
        console.log('Dropped:', $event);
    }
}
