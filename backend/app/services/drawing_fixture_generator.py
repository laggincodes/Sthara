"""
Golden Drawing Test Fixture Generator for STHARA Drawing Intelligence v1.
Generates authentic vector-drawn PDF sheets with real geometry, text tokens,
dimensions, title blocks, and room labels for the 4 golden test files:
- 20 ARCH PLAN.pdf
- 20 STRU PLAN 1.pdf
- 20 STRU PLAN 2.pdf
- 20 STRU PLAN 3.pdf
"""

import os
from typing import Dict
from pathlib import Path
import pymupdf as fitz  # PyMuPDF

DEMO_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "demo" / "drawing_intelligence"


def generate_golden_drawing_fixtures() -> Dict[str, Path]:
    """Generates the 4 golden PDF test fixtures if they do not already exist."""
    DEMO_DIR.mkdir(parents=True, exist_ok=True)
    
    files = {
        "20 ARCH PLAN.pdf": _create_arch_plan_pdf(DEMO_DIR / "20 ARCH PLAN.pdf"),
        "20 STRU PLAN 1.pdf": _create_stru_plan_1_pdf(DEMO_DIR / "20 STRU PLAN 1.pdf"),
        "20 STRU PLAN 2.pdf": _create_stru_plan_2_pdf(DEMO_DIR / "20 STRU PLAN 2.pdf"),
        "20 STRU PLAN 3.pdf": _create_stru_plan_3_pdf(DEMO_DIR / "20 STRU PLAN 3.pdf"),
    }
    return files


def _draw_sheet_border_and_title_block(page, title: str, sheet_no: str, discipline: str):
    w, h = page.rect.width, page.rect.height
    shape = page.new_shape()
    
    # Outer sheet border
    shape.draw_rect(fitz.Rect(20, 20, w - 20, h - 20))
    shape.finish(color=(0.1, 0.1, 0.1), width=1.5)
    
    # Inner border
    shape.draw_rect(fitz.Rect(25, 25, w - 25, h - 25))
    shape.finish(color=(0.3, 0.3, 0.3), width=0.75)
    
    # Title block in bottom right corner (x: w - 320 to w - 25, y: h - 110 to h - 25)
    tb_rect = fitz.Rect(w - 320, h - 110, w - 25, h - 25)
    shape.draw_rect(tb_rect)
    shape.finish(color=(0.1, 0.1, 0.1), fill=(0.96, 0.96, 0.96), width=1.0)
    
    # Dividing lines in title block
    shape.draw_line(fitz.Point(w - 320, h - 80), fitz.Point(w - 25, h - 80))
    shape.draw_line(fitz.Point(w - 320, h - 50), fitz.Point(w - 25, h - 50))
    shape.draw_line(fitz.Point(w - 140, h - 80), fitz.Point(w - 140, h - 25))
    shape.finish(color=(0.3, 0.3, 0.3), width=0.5)
    shape.commit()
    
    # Text in title block
    page.insert_text(fitz.Point(w - 310, h - 92), "PROJECT: RESIDENTIAL DEVELOPMENT", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.1))
    page.insert_text(fitz.Point(w - 310, h - 64), f"SHEET TITLE: {title}", fontsize=9, fontname="helv", color=(0.1, 0.1, 0.1))
    page.insert_text(fitz.Point(w - 310, h - 34), f"DISCIPLINE: {discipline}", fontsize=8, fontname="helv", color=(0.3, 0.3, 0.3))
    page.insert_text(fitz.Point(w - 130, h - 64), f"DWG NO: {sheet_no}", fontsize=9, fontname="helv", color=(0.1, 0.1, 0.1))
    page.insert_text(fitz.Point(w - 130, h - 34), "SCALE: 1:100 @ A1", fontsize=8, fontname="helv", color=(0.3, 0.3, 0.3))


def _create_arch_plan_pdf(output_path: Path) -> Path:
    # A1 Landscape: 841 x 594 mm -> in pt: 2384 x 1684 pt (or 1191 x 842 pt for compact A1)
    doc = fitz.open()
    page = doc.new_page(width=1191, height=842)
    _draw_sheet_border_and_title_block(page, "COMPREHENSIVE ARCHITECTURAL PLANS & SECTIONS", "A-101", "ARCHITECTURAL")
    
    shape = page.new_shape()
    
    # -------------------------------------------------------------
    # REGION 1: SITE PLAN (Top Left: x=40..380, y=40..360)
    # -------------------------------------------------------------
    shape.draw_rect(fitz.Rect(40, 40, 380, 360))
    shape.finish(color=(0.6, 0.6, 0.6), width=0.5)
    page.insert_text(fitz.Point(50, 60), "SITE PLAN - PROPOSED LAYOUT", fontsize=11, fontname="helv", color=(0.1, 0.1, 0.1))
    page.insert_text(fitz.Point(50, 75), "SCALE 1:500", fontsize=8, fontname="helv", color=(0.4, 0.4, 0.4))
    
    # Road at bottom
    shape.draw_rect(fitz.Rect(50, 310, 370, 345))
    shape.finish(color=(0.4, 0.4, 0.4), fill=(0.92, 0.92, 0.92), width=0.75)
    page.insert_text(fitz.Point(170, 330), "18.0M WIDE MAIN SECTOR ROAD", fontsize=8, fontname="helv", color=(0.3, 0.3, 0.3))
    
    # Site Boundary (Plot area)
    site_rect = fitz.Rect(70, 90, 350, 300)
    shape.draw_rect(site_rect)
    shape.finish(color=(0.8, 0.2, 0.2), width=1.2) # Red dashed property line
    page.insert_text(fitz.Point(80, 105), "PLOT BOUNDARY: 28.0m x 21.0m (588.0 m²)", fontsize=8, fontname="helv", color=(0.7, 0.1, 0.1))
    
    # Building Footprint Candidate inside Site (with 3m / 4m setbacks)
    bld_site_rect = fitz.Rect(110, 130, 310, 270)
    shape.draw_rect(bld_site_rect)
    shape.finish(color=(0.1, 0.4, 0.8), fill=(0.88, 0.92, 0.98), width=1.5)
    page.insert_text(fitz.Point(150, 200), "BUILDING FOOTPRINT", fontsize=9, fontname="helv", color=(0.1, 0.2, 0.6))
    page.insert_text(fitz.Point(155, 215), "20.0m x 14.0m (280.0 m²)", fontsize=8, fontname="helv", color=(0.2, 0.3, 0.7))
    page.insert_text(fitz.Point(175, 230), "SETBACK: 4.0m", fontsize=7, fontname="helv", color=(0.4, 0.4, 0.4))
    
    # North Arrow
    shape.draw_line(fitz.Point(340, 80), fitz.Point(340, 55))
    shape.finish(color=(0.1, 0.1, 0.1), width=1.5)
    page.insert_text(fitz.Point(336, 50), "N", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.1))
    
    # -------------------------------------------------------------
    # REGION 2: GROUND FLOOR PLAN (Bottom Left: x=40..380, y=380..720)
    # -------------------------------------------------------------
    shape.draw_rect(fitz.Rect(40, 380, 380, 720))
    shape.finish(color=(0.6, 0.6, 0.6), width=0.5)
    page.insert_text(fitz.Point(50, 400), "GROUND FLOOR PLAN", fontsize=11, fontname="helv", color=(0.1, 0.1, 0.1))
    page.insert_text(fitz.Point(50, 415), "SCALE 1:100", fontsize=8, fontname="helv", color=(0.4, 0.4, 0.4))
    
    # Ground Floor outer wall
    gf_rect = fitz.Rect(80, 430, 340, 680)
    shape.draw_rect(gf_rect)
    shape.finish(color=(0.1, 0.1, 0.1), width=2.0)
    
    # Ground Floor subdivisions (Entrance Lobby, Stilt Parking, Guard Room, Lift & Stairs)
    shape.draw_rect(fitz.Rect(80, 430, 210, 570)) # Parking / Lobby
    shape.draw_rect(fitz.Rect(210, 430, 340, 570)) # Services / Retail
    shape.draw_rect(fitz.Rect(180, 570, 240, 640)) # Lift & Core
    shape.finish(color=(0.3, 0.3, 0.3), width=1.0)
    
    page.insert_text(fitz.Point(100, 490), "MAIN ENTRANCE LOBBY & STILT PARKING", fontsize=8, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text(fitz.Point(230, 490), "COMMUNITY / UTILITY SPACE", fontsize=8, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text(fitz.Point(190, 605), "CORE (LIFT/STAIR)", fontsize=7, fontname="helv", color=(0.3, 0.3, 0.3))
    
    # -------------------------------------------------------------
    # REGION 3: TYPICAL FLOOR PLAN (FLOORS 1 TO 6) (Center: x=400..800, y=40..460)
    # -------------------------------------------------------------
    shape.draw_rect(fitz.Rect(400, 40, 800, 460))
    shape.finish(color=(0.6, 0.6, 0.6), width=0.5)
    page.insert_text(fitz.Point(410, 60), "TYPICAL FLOOR PLAN (FLOORS 1 TO 6)", fontsize=12, fontname="helv", color=(0.1, 0.1, 0.1))
    page.insert_text(fitz.Point(410, 75), "SCALE 1:100  |  RESIDENTIAL APARTMENTS", fontsize=8, fontname="helv", color=(0.4, 0.4, 0.4))
    
    # Building Perimeter Walls
    tf_outer = fitz.Rect(430, 95, 770, 430)
    shape.draw_rect(tf_outer)
    shape.finish(color=(0.0, 0.0, 0.0), width=2.5)
    
    # Central Core & Corridor: x=580..620, y=95..430
    core_rect = fitz.Rect(580, 220, 620, 310)
    shape.draw_rect(core_rect)
    shape.finish(color=(0.2, 0.2, 0.2), fill=(0.9, 0.9, 0.9), width=1.0)
    page.insert_text(fitz.Point(585, 260), "LIFT", fontsize=7, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text(fitz.Point(585, 280), "STAIR", fontsize=7, fontname="helv", color=(0.2, 0.2, 0.2))
    
    # Corridor
    shape.draw_rect(fitz.Rect(570, 95, 630, 430))
    shape.finish(color=(0.5, 0.5, 0.5), width=0.75)
    page.insert_text(fitz.Point(575, 160), "CORRIDOR", fontsize=6, fontname="helv", color=(0.4, 0.4, 0.4))
    page.insert_text(fitz.Point(575, 370), "CORRIDOR", fontsize=6, fontname="helv", color=(0.4, 0.4, 0.4))
    
    # Unit A-01 (Left wing: x=430..570, y=95..430, ~140 x 335 pt -> ~92.4 m²)
    u1_rect = fitz.Rect(430, 95, 570, 430)
    shape.draw_rect(u1_rect)
    shape.finish(color=(0.1, 0.5, 0.2), width=1.5)
    
    # Unit A-01 Interior Rooms
    shape.draw_line(fitz.Point(430, 240), fitz.Point(570, 240)) # Living vs Bedroom
    shape.draw_line(fitz.Point(500, 240), fitz.Point(500, 430)) # Bed 1 vs Bed 2
    shape.draw_line(fitz.Point(430, 160), fitz.Point(510, 160)) # Kitchen
    shape.finish(color=(0.4, 0.4, 0.4), width=0.75)
    
    page.insert_text(fitz.Point(450, 120), "UNIT A-01 (3 BHK)", fontsize=9, fontname="helv", color=(0.1, 0.5, 0.2))
    page.insert_text(fitz.Point(450, 135), "AREA: 92.4 m²", fontsize=8, fontname="helv", color=(0.2, 0.4, 0.2))
    page.insert_text(fitz.Point(440, 200), "LIVING / DINING", fontsize=7, fontname="helv", color=(0.3, 0.3, 0.3))
    page.insert_text(fitz.Point(440, 180), "KITCHEN", fontsize=6, fontname="helv", color=(0.4, 0.4, 0.4))
    page.insert_text(fitz.Point(440, 310), "BEDROOM 1", fontsize=7, fontname="helv", color=(0.3, 0.3, 0.3))
    page.insert_text(fitz.Point(510, 310), "BEDROOM 2", fontsize=7, fontname="helv", color=(0.3, 0.3, 0.3))
    page.insert_text(fitz.Point(440, 410), "BALCONY", fontsize=6, fontname="helv", color=(0.4, 0.4, 0.4))
    
    # Unit A-02 (Right wing Top: x=630..770, y=95..260, ~86.2 m²)
    u2_rect = fitz.Rect(630, 95, 770, 260)
    shape.draw_rect(u2_rect)
    shape.finish(color=(0.1, 0.3, 0.7), width=1.5)
    shape.draw_line(fitz.Point(630, 180), fitz.Point(770, 180))
    shape.finish(color=(0.4, 0.4, 0.4), width=0.75)
    
    page.insert_text(fitz.Point(650, 120), "UNIT A-02 (2 BHK)", fontsize=9, fontname="helv", color=(0.1, 0.3, 0.7))
    page.insert_text(fitz.Point(650, 135), "AREA: 86.2 m²", fontsize=8, fontname="helv", color=(0.2, 0.3, 0.6))
    page.insert_text(fitz.Point(650, 160), "LIVING / DINING", fontsize=7, fontname="helv", color=(0.3, 0.3, 0.3))
    page.insert_text(fitz.Point(650, 220), "MASTER BEDROOM", fontsize=7, fontname="helv", color=(0.3, 0.3, 0.3))
    page.insert_text(fitz.Point(730, 245), "BALCONY", fontsize=6, fontname="helv", color=(0.4, 0.4, 0.4))
    
    # Unit A-03 (Right wing Bottom: x=630..770, y=265..430, ~88.5 m²)
    u3_rect = fitz.Rect(630, 265, 770, 430)
    shape.draw_rect(u3_rect)
    shape.finish(color=(0.7, 0.4, 0.1), width=1.5)
    shape.draw_line(fitz.Point(630, 350), fitz.Point(770, 350))
    shape.finish(color=(0.4, 0.4, 0.4), width=0.75)
    
    page.insert_text(fitz.Point(650, 290), "UNIT A-03 (2 BHK)", fontsize=9, fontname="helv", color=(0.7, 0.4, 0.1))
    page.insert_text(fitz.Point(650, 305), "AREA: 88.5 m²", fontsize=8, fontname="helv", color=(0.6, 0.3, 0.1))
    page.insert_text(fitz.Point(650, 330), "LIVING / DINING", fontsize=7, fontname="helv", color=(0.3, 0.3, 0.3))
    page.insert_text(fitz.Point(650, 390), "BEDROOM 1", fontsize=7, fontname="helv", color=(0.3, 0.3, 0.3))
    
    # -------------------------------------------------------------
    # REGION 4: BUILDING SECTION A-A (Right: x=820..1160, y=40..460)
    # -------------------------------------------------------------
    shape.draw_rect(fitz.Rect(820, 40, 1160, 460))
    shape.finish(color=(0.6, 0.6, 0.6), width=0.5)
    page.insert_text(fitz.Point(830, 60), "BUILDING SECTION A-A", fontsize=11, fontname="helv", color=(0.1, 0.1, 0.1))
    page.insert_text(fitz.Point(830, 75), "SCALE 1:100  |  VERTICAL STRATIFICATION & LEVELS", fontsize=8, fontname="helv", color=(0.4, 0.4, 0.4))
    
    # Ground line at y=400 (Elevation: 0.00m)
    shape.draw_line(fitz.Point(840, 400), fitz.Point(1140, 400))
    shape.finish(color=(0.4, 0.2, 0.1), width=2.0)
    page.insert_text(fitz.Point(845, 415), "GROUND LEVEL: ±0.00m", fontsize=7, fontname="helv", color=(0.4, 0.2, 0.1))
    
    # Plinth Level at y=385 (+0.60m)
    shape.draw_line(fitz.Point(880, 385), fitz.Point(1080, 385))
    page.insert_text(fitz.Point(1090, 388), "PLINTH LEVEL +0.60m", fontsize=7, fontname="helv", color=(0.2, 0.2, 0.2))
    
    # Floors 1 to 6 & Roof lines
    # Scale: 3.2m per floor -> ~40 pt per floor
    floors = [
        ("GROUND FLOOR (H=3.20m)", 345, "LVL +3.80m"),
        ("FLOOR 1 (H=3.20m)", 305, "LVL +7.00m"),
        ("FLOOR 2 (H=3.20m)", 265, "LVL +10.20m"),
        ("FLOOR 3 (H=3.20m)", 225, "LVL +13.40m"),
        ("FLOOR 4 (H=3.20m)", 185, "LVL +16.60m"),
        ("FLOOR 5 (H=3.20m)", 145, "LVL +19.80m"),
        ("FLOOR 6 (H=3.20m)", 105, "LVL +22.80m"),
        ("ROOF PARAPET TOP", 80, "TOP OF BUILDING +22.80m"),
    ]
    
    # Building Vertical Box in Section
    shape.draw_rect(fitz.Rect(890, 105, 1070, 385))
    shape.finish(color=(0.1, 0.1, 0.1), width=1.5)
    
    for label, y_pos, lvl_text in floors:
        shape.draw_line(fitz.Point(870, y_pos), fitz.Point(1080, y_pos))
        page.insert_text(fitz.Point(895, y_pos + 15), label, fontsize=6.5, fontname="helv", color=(0.3, 0.3, 0.3))
        page.insert_text(fitz.Point(1085, y_pos + 3), lvl_text, fontsize=7, fontname="helv", color=(0.1, 0.4, 0.7))
    
    shape.finish(color=(0.3, 0.3, 0.3), width=0.75)
    
    # Dimension lines on the left of section
    page.insert_text(fitz.Point(835, 250), "TOTAL HEIGHT = 22.80m", fontsize=7.5, fontname="helv", color=(0.8, 0.2, 0.2))
    page.insert_text(fitz.Point(835, 265), "TYPICAL FLOOR H = 3.20m", fontsize=7, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text(fitz.Point(835, 280), "TOTAL FLOORS = G+6 (7 FLOORS)", fontsize=7, fontname="helv", color=(0.1, 0.4, 0.2))
    
    # -------------------------------------------------------------
    # REGION 5: FRONT ELEVATION (Bottom Right: x=400..800, y=480..720)
    # -------------------------------------------------------------
    shape.draw_rect(fitz.Rect(400, 480, 800, 720))
    shape.finish(color=(0.6, 0.6, 0.6), width=0.5)
    page.insert_text(fitz.Point(410, 500), "NORTH FRONT ELEVATION", fontsize=11, fontname="helv", color=(0.1, 0.1, 0.1))
    page.insert_text(fitz.Point(410, 515), "SCALE 1:100", fontsize=8, fontname="helv", color=(0.4, 0.4, 0.4))
    
    # Elevation Facade Box
    shape.draw_rect(fitz.Rect(460, 530, 740, 700))
    shape.finish(color=(0.1, 0.1, 0.1), width=1.5)
    
    # Floor lines and window grids on facade
    for f_idx in range(6):
        fy = 530 + f_idx * 28
        shape.draw_line(fitz.Point(460, fy), fitz.Point(740, fy))
        # Windows
        shape.draw_rect(fitz.Rect(480, fy + 5, 520, fy + 22))
        shape.draw_rect(fitz.Rect(550, fy + 5, 590, fy + 22))
        shape.draw_rect(fitz.Rect(620, fy + 5, 660, fy + 22))
        shape.draw_rect(fitz.Rect(690, fy + 5, 720, fy + 22))
    shape.finish(color=(0.4, 0.4, 0.4), width=0.5)
    
    shape.commit()
    doc.save(str(output_path))
    doc.close()
    return output_path


def _create_stru_plan_1_pdf(output_path: Path) -> Path:
    doc = fitz.open()
    page = doc.new_page(width=1191, height=842)
    _draw_sheet_border_and_title_block(page, "FOUNDATION PLAN & COLUMN FOOTING DETAILS", "S-101", "STRUCTURAL")
    
    shape = page.new_shape()
    page.insert_text(fitz.Point(50, 60), "FOUNDATION PLAN & COLUMN FOOTING GRID", fontsize=12, fontname="helv", color=(0.1, 0.1, 0.1))
    page.insert_text(fitz.Point(50, 75), "SCALE 1:100  |  ISOLATED & STRIP RCC FOOTINGS", fontsize=8, fontname="helv", color=(0.4, 0.4, 0.4))
    
    # Grid lines A, B, C, D and 1, 2, 3, 4
    for i, x in enumerate([200, 400, 600, 800, 1000]):
        shape.draw_line(fitz.Point(x, 120), fitz.Point(x, 700))
        page.insert_text(fitz.Point(x - 5, 110), f"GRID {i+1}", fontsize=9, fontname="helv", color=(0.2, 0.2, 0.6))
    for j, y in enumerate([180, 320, 460, 600]):
        shape.draw_line(fitz.Point(150, y), fitz.Point(1050, y))
        page.insert_text(fitz.Point(120, y + 4), f"GRID {chr(65+j)}", fontsize=9, fontname="helv", color=(0.2, 0.2, 0.6))
    shape.finish(color=(0.6, 0.6, 0.8), width=0.5)
    
    # Footing pads & Column bases
    for x in [200, 400, 600, 800, 1000]:
        for y in [180, 320, 460, 600]:
            shape.draw_rect(fitz.Rect(x - 25, y - 25, x + 25, y + 25))
            shape.draw_rect(fitz.Rect(x - 10, y - 10, x + 10, y + 10))
            page.insert_text(fitz.Point(x - 18, y + 35), "F1 (C1)", fontsize=6, fontname="helv", color=(0.3, 0.3, 0.3))
    shape.finish(color=(0.1, 0.1, 0.1), width=1.0)
    
    # Structural Notes
    page.insert_text(fitz.Point(50, 750), "GENERAL STRUCTURAL NOTES: CONCRETE GRADE M30, STEEL GRADE Fe500D. SBC = 220 kN/m² AT 2.5M DEPTH.", fontsize=8, fontname="helv", color=(0.3, 0.3, 0.3))
    
    shape.commit()
    doc.save(str(output_path))
    doc.close()
    return output_path


def _create_stru_plan_2_pdf(output_path: Path) -> Path:
    doc = fitz.open()
    page = doc.new_page(width=1191, height=842)
    _draw_sheet_border_and_title_block(page, "TYPICAL FLOOR RCC FRAMING & BEAM LAYOUT", "S-102", "STRUCTURAL")
    
    shape = page.new_shape()
    page.insert_text(fitz.Point(50, 60), "TYPICAL FLOOR RCC FRAMING PLAN (FLOORS 1 TO 6)", fontsize=12, fontname="helv", color=(0.1, 0.1, 0.1))
    page.insert_text(fitz.Point(50, 75), "SCALE 1:100  |  RCC BEAM SCHEDULE & SLAB DEPTH 150mm", fontsize=8, fontname="helv", color=(0.4, 0.4, 0.4))
    
    # Perimeter & interior beams
    shape.draw_rect(fitz.Rect(180, 120, 1020, 660))
    shape.finish(color=(0.1, 0.1, 0.1), width=2.0)
    
    for x in [380, 580, 780, 980]:
        shape.draw_line(fitz.Point(x, 120), fitz.Point(x, 660))
    for y in [260, 400, 540]:
        shape.draw_line(fitz.Point(180, y), fitz.Point(1020, y))
    shape.finish(color=(0.2, 0.2, 0.2), width=1.2)
    
    # Beam Labels
    page.insert_text(fitz.Point(260, 190), "B1 (230x450)", fontsize=7, fontname="helv", color=(0.3, 0.3, 0.3))
    page.insert_text(fitz.Point(460, 190), "B2 (230x500)", fontsize=7, fontname="helv", color=(0.3, 0.3, 0.3))
    page.insert_text(fitz.Point(660, 190), "B1 (230x450)", fontsize=7, fontname="helv", color=(0.3, 0.3, 0.3))
    page.insert_text(fitz.Point(860, 190), "B3 (230x450)", fontsize=7, fontname="helv", color=(0.3, 0.3, 0.3))
    
    page.insert_text(fitz.Point(50, 750), "SLAB THICKNESS S1 = 150mm TWO-WAY SLAB. COVER TO MAIN REINFORCEMENT = 25mm.", fontsize=8, fontname="helv", color=(0.3, 0.3, 0.3))
    
    shape.commit()
    doc.save(str(output_path))
    doc.close()
    return output_path


def _create_stru_plan_3_pdf(output_path: Path) -> Path:
    doc = fitz.open()
    page = doc.new_page(width=1191, height=842)
    _draw_sheet_border_and_title_block(page, "COLUMN & BEAM REINFORCEMENT DETAILS", "S-103", "STRUCTURAL")
    
    shape = page.new_shape()
    page.insert_text(fitz.Point(50, 60), "REINFORCEMENT DETAILS & COLUMN ELEVATION SCHEDULE", fontsize=12, fontname="helv", color=(0.1, 0.1, 0.1))
    page.insert_text(fitz.Point(50, 75), "SCALE 1:25 & 1:50  |  BAR BENDING SCHEDULE & LAP LENGTHS", fontsize=8, fontname="helv", color=(0.4, 0.4, 0.4))
    
    # Cross section sketches for columns C1, C2, C3
    cols = [
        ("COLUMN C1 (300x600)", 150, 160, "8-T20 + 4-T16, 8mm TIES @ 150 c/c"),
        ("COLUMN C2 (300x450)", 500, 160, "6-T20 + 2-T16, 8mm TIES @ 150 c/c"),
        ("COLUMN C3 (300x300)", 850, 160, "4-T20 + 4-T12, 8mm TIES @ 150 c/c"),
    ]
    for name, x, y, spec in cols:
        shape.draw_rect(fitz.Rect(x, y, x + 180, y + 240))
        shape.finish(color=(0.1, 0.1, 0.1), width=1.5)
        page.insert_text(fitz.Point(x + 10, y - 10), name, fontsize=9, fontname="helv", color=(0.1, 0.1, 0.1))
        page.insert_text(fitz.Point(x + 10, y + 260), spec, fontsize=7, fontname="helv", color=(0.3, 0.3, 0.3))
    
    shape.commit()
    doc.save(str(output_path))
    doc.close()
    return output_path
