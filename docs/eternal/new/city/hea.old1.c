inherit RoomPlusCode;
 
#include "path.h"
 
void extra_create()
{
  set( "short", "Heart of Eternal City" );
  set( "day_long",
    "This is the center of Eternal City, the City of Infinity.  For "
    "lack of a better way of describing it, everything surrounding "
    "you seems to be existing in a chaotic state.  All around you "
    "stand structures that slip through a variety of hues and "
    "sizes as they constantly morph.  Peering up, you find the sky "
    "to be in flux as well, perfectly complementing the insanity of "
    "your environment.  Iron rungs descend into a dark hole off to "
    "one side, and a spiral staircase leads up into a thin tower in "
    "the middle of this intersection; two roads that lead in each "
    "of the four main cardinal directions." );
  set( "day_light", SUNLIGHT );
  set( "exits", ([
    "north" : "@north",
    "south" : "@south",
    "east"  : "@east",
    "west"  : "@west",
    "down"  : CITY "ope(0,0,-1)",
    "up"    : CITY "lou(0,0,1)",
    ]) );
  set( "descs", ([
    "hole" :
      "The sounds of machinery emanate from the opening.  The "
      "iron rungs of a ladder vanish into the darkness.",
    ({ "ladder", "rungs", "rung", "iron ladder",
       "iron rungs", "iron rung" }) :
      "Just your average, ordinary iron ladder.  It descends "
      "into the darkness of an opening in the ground.",
    ({ "staircase", "spiral staircase", "stairs" }) :
      "The staircase starts near a doorway in the base of the "
      "tower, and ascends upwards, spiraling around the inside "
      "of the structure.",
    ({ "structure", "tower", "thin tower" }) :
      "This tower seems to be defying a couple of key laws of "
      "physics.  It slimly soars into the air before widening "
      "out dramatically, not to mention impossibly, at the top.",
    ]) );
  set( OutsideP, 1 );
}
                                        
void extra_init()
{
  switch( random( 4 ) )
  {
    case 0 :
      THISO -> set( "ansi_short",
        HIK + "Heart of Eternal City" );
      THISO -> set( "day_color", HIK );
      set( ZoneP, "null" );
      add( "descs", ([
        ({ "buildings", "building", "structures" }) :
          "You feel overwhelmed with the bright neon signs and "
          "loud advertisements densely covering the surrounding "
          "structures.  Stores of all varieties, time periods, "
          "and possiblities, cram every square inch of space "
          "that isn't taken up by roadage, as well as soaring "
          "hundreds of feet into the air.",
        ({ "sky", "skies", "up", "upwards" }) :
          "The sky is completely black.  Not even stars shine in "
          "this emptiness.  The only light comes from the bright "
          "chaos of the garish buildings lining the road."
        ]) );
      break;
    case 1 :
      THISO -> set( "ansi_short",
        HIC + "Heart of Eternal City" );
      THISO -> set( "day_color", HIC );
      set( ZoneP, "fantasy" );
      add( "descs", ([
        ({ "buildings", "building", "structures" }) :
          "A large variety of wooden and stone buildings "
          "line the roads; vendors loudly urge passerby "
          "from their carts to stop and peruse their wares.",
        ({ "sky", "skies", "up", "upwards" }) :
          "High overhead you can see a faint rippling in the "
          "clear blue sky, a reminder of the existance of the "
          "Shield used to protect the city.", 
        ]) );
      break;
    case 2 : 
      THISO -> set( "ansi_short",
        CYN + "Heart of Eternal City" );
      THISO -> set( "day_color", CYN );
      set( ZoneP, "future" );
      add( "descs", ([
        ({ "buildings", "building", "structures" }) :
          "Sleek, sterile buildings rise from the ground, "
          "each no-doubt belonging to some corporation or "
          "another.",
        ({ "sky", "skies", "up", "upwards" }) :
          "The sky is a dingy blue, probably a direct result "
          "of the high levels of pollution.", 
        ]) );
      break;
    case 3 :
      THISO -> set( "ansi_short",
        HIB + "Heart of Eternal City" );
      THISO -> set( "day_color", HIB );
      set( ZoneP, "present" );
      add( "descs", ([
        ({ "buildings", "building", "structures" }) :
          "Various modern commercial establishments rise "
          "two stories high here, and all seem to be open "
          "for business.",
        ({ "sky", "skies", "up", "upwards" }) :
          "The sky is a bright blue, and the sun shines "
          "down warmly.", 
        ]) );
      break;
  }
}
 
north()
{
  message_thingy();
  switch( random( 10 ) )
  {
    case 0..4 :
      move_object( THISP, NULL "ete(0,1,0)" );
      break;
    case 5..7 :
      move_object( THISP, FANTASY "ete(0,1,0)" );
      break;
    case 8 :
      move_object( THISP, PRESENT "ete(0,1,0)" );
      break;
    case 9 :
      move_object( THISP, FUTURE "ete(0,1,0)" );
      break;
  }
  command( "glance", THISP );
  return 1;
}
 
south()
{
  message_thingy();
  switch( random( 10 ) )
  {
    case 0..1 :
    move_object( THISP, NULL "ete(0,-1,0)" );
      break;
    case 2..3 :
      break;
    move_object( THISP, FANTASY "ete(0,-1,0)" );
      break;
    case 4..8 :
    move_object( THISP, PRESENT "ete(0,-1,0)" );
      break;
    case 9 :
    move_object( THISP, FUTURE "ete(0,-1,0)" );
      break;
  }
  command( "glance", THISP );
  return 1;
}
 
east()
{
  message_thingy();
  switch( random( 10 ) )
  {
    case 0 :
      move_object( THISP, NULL "ete(1,0,0)" );
      break;
    case 1..6 :
      move_object( THISP, FANTASY "ete(1,0,0)" );
      break;
    case 7..8 :
      move_object( THISP, PRESENT " ete(1,0,0)" );
      break;
    case 9 :
      move_object( THISP, FUTURE "ete(1,0,0)" );
      break;
  }
  command( "glance", THISP );
  return;
}
 
west()
{
  message_thingy();
  switch( random( 10 ) )
  {
    case 0 :
      move_object( THISP, NULL "ete(0,1,0)" );
      break;
    case 1..3 :
      move_object( THISP, FANTASY "ete(0,1,0)" );
      break;
    case 4 :
      move_object( THISP, PRESENT " ete(0,1,0)" );
      break;
    case 5..9 :
      move_object( THISP, FUTURE "ete(0,1,0)" );
      break;
  }
  command( "glance", THISP );
  return;
}
 
message_thingy()
{
  switch( random( 10 ) )
  {
    case 0 :
      write( strformat( "A strange flash of light envelops you!\n"
        "You blink your eyes as the glare dies down to reveal.." ) );
      say( strformat( PNAME + " steps " + query_verb() + ", and "
        "vanishes in a sharp burst of light." ) );
      break;
    case 1 :
      write( strformat( capitalize( query_verb() ) +
        "ward you travel, and the world changes around you..." ) );
      say( strformat( PNAME + " moves " + query_verb() +
        "ward, and seems to melt into nothingness." ) );
      break;
    case 2 :
      write( strformat( "You move off to the " + query_verb() +
        ", the universe doing odd things all around you." ) );
      say( strformat( PNAME + "'s figure shrinks away into the "
        "distance, as he moves off to the " + query_verb() +
        "." ) );
      break;
    case 3 :
      write( strformat( "As you travel " + query_verb() + 
        ", everything darkens momentarily.." ) );
      say( strformat( PNAME + " travels " + query_verb() +
        ", and gradually fades from view." ) ); 
      break;
    case 4 :
      write( strformat( capitalize( query_verb() ) + ".\n"
        "There lies your path.\nYou follow it.\n"
        "Reality burps." ) );
      say( strformat( PNAME + " leaves " + query_verb() +
        ", much the way a large, immovable stone block doesn't." ) );
      break;
    case 5 :
      write( strformat( "A strange mist rises up, and when it "
        "clears, you see..." ) );
      say( strformat( "A strange mist rises up to envelop " + 
        PNAME + " as " + objective( THISP ) + " moves " +
        query_verb() + "." ) );
      break;
    case 6 :
      write( strformat( "The smell of paprika wafts past your nose, "
        "oddly enough, and you look up to realize that your "
        "surroundings have changed while you were preoccupied." ) );
      say( strformat( PNAME + " steps " + query_verb() + ", looks "
        "around with an odd expression, and promptly disappears "
        "in as enigmatic a manner as is possible." ) );
      break;
    case 7 :
      write( strformat( "Space and time give a slight twitch.." ) );
      say( strformat( "A huge wormhole opens up to the " + 
        query_verb() + ", into which " + PNAME + " steps, quite "
        "obliviously." ) );
      break;
    case 8 :
      write( strformat( "God, approving your choice of exits, "
        "reaches down from the heavens to give you a high-five, "
        "tossing you violently through the air and to the " +
        query_verb() + ".\nYou dazedly look up to see..." ) );
      say( strformat( "God reaches down and gives " + PNAME +
        " a high-five, tossing " + subjective( THISP ) +
        " violently " + query_verb() + "ward and out of "
        "sight." ) );
      break;
    case 9 :
      write( strformat( "You feel exactly as though you have been "
        "turned momentarily inside-out, except that you are not "
        "feeling dead." ) );
      say( strformat( PNAME + THISP->query_msgout() +
        query_verb() + "." ) );
      break;
  }
  return;
}
