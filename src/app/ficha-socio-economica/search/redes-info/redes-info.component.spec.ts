import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RedesInfoComponent } from './redes-info.component';

describe('RedesInfoComponent', () => {
  let component: RedesInfoComponent;
  let fixture: ComponentFixture<RedesInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RedesInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RedesInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
