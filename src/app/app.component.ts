import { Component } from '@angular/core';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {
    title = 'dragdrop-lib';
    canDrag = false;

    constructor() {
        document.onmouseup = () => this.canDrag = false;
    }

    handleMouseDown() {
        this.canDrag = true;
        console.log(this.canDrag);
    }

    handleMouseUp() {
        this.canDrag = false;
    }

    onDroppableTest($event) {
        console.log('Droppable test: ', $event);
        return true;
    }

    onDragDrop($event) {
        console.log('Dropped:', $event)
    }
}
