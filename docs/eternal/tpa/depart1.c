inherit RoomPlusCode;

void
extra_create()
{
  set( "short", "Eternal City Terminal: Departure Gate 1" );
  set( "day_long", "Two steps lead up to a square platform, on which sits the "
                   "teleport console.  A grate makes up the surface of the "
                   "platform, with lights beneath it providing illumination "
                   "for the rest of the room.  Cameras mounted in the corners "
                   "of the room record people's actions as they come and "
                   "go." );
  set( "day_light", PART_LIT );
  set( "night_light", PART_LIT );
  set( "exits", ([ "southeast" : "/zone/null/eternal/tpa/station" ]) );
  set( "descs", ([ ({ "step", "steps" }) :
                   "The two steps go around the entire perimeter of the "
                   "platform, which sits about 18 inches off the ground.",
                   ({ "platform", "square platform" }) :
                   "It's just a simple square platform, about half the size "
                   "of the room itself.  The console is mounted in the "
                   "center of the platform.",
                   ({ "grate", "surface" }) :
                   "Some plastic diffusion has been laid over the lights "
                   "beneath the grate.  It looks like some loose change has "
                   "fallen down there...does that count as littering?",
                   ({ "lights", "light" }) :
                   "They say that being lit from below always makes things "
                   "seem more dramatic.  All these lights seem to do is make "
                   "you look fat.", 
                   ({ "camera", "cameras" }) :
                   "Though tinted glass domes prevent you from seeing "
                   "exactly where the cameras are pointed, irrational "
                   "paranoia suggests they're all pointed at you." ]) );
  set( InsideP, 1 );
  replace_program(RoomPlusCode);
  return;
}

