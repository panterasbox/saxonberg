inherit RoomPlusCode;
 
#include "path.h"
 
string zone;
 
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
  set( OutsideP, 1 );
  zone = "null";
  call_out( "change_stuff", 1 );
}
                                        
desc_thingy()
{
  THISO -> add( "descs", ([
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
  return;
}
 
change_stuff()
{
  tell_room( THISO, "\n" );
  switch( random( 4 ) )
  {
    case 0 :
      switch( zone )
        {
        case "null" :
          break;
        case "fantasy" :
          tell_room( THISO, strformat( "The bright blue sky "
            "darkens until it is completely pitch-black.  Neon "
            "signs appear on the rapidly growing and crowding "
            "buildings, the stone structures melting into "
            "smooth surfaces." ) );
          break;
        case "present" :
          tell_room( THISO, strformat( "The sky fades into "
            "darkness.  Gaudy advertisements flicker into "
            "existance on the buildings as they suddenly "
            "swell in height and density." ) );
          break;
        case "future" :
          tell_room( THISO, strformat( "The massive, sterile "
            "skyscrapers shrink in height, bright logos "
            "blossoming out from the walls, as the smog-filled "
            "sky darkens into a starless night." ) );
          break;
      }
      zone = "null";
      THISO -> set( "ansi_short",
        HIK + "Heart of Eternal City" );
      THISO -> set( "day_color", HIK );
      THISO -> set( "descs", ([
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
      desc_thingy();
      break;
    case 1 :
      switch( zone )
        {
        case "null" :
          tell_room( THISO, strformat( "The black sky brightens "
            "to a bright blue, as the flashing signs are gradually "
            "replaced with stone-constructed buildings." ) );
          break;
        case "fantasy" :
          break;
        case "present" :
          tell_room( THISO, strformat( "The sky changes to a "
            "slightly different shade of blue, as the brick and "
            "concrete of the commercial buildings bubble out "
            "into rough-hewn stone and wood." ) ); 
          break;
        case "future" :
          tell_room( THISO, strformat( "The skyscrapers accelerate "
            "towards the ground, stabilizing when they reach the "
            "height of a single story; the smog almost imploding "
            "into a view of the blue sky, unobstructed except for "
            "the faint rippling of the Shield." ) );
          break;
      }
      zone = "fantasy";
      THISO -> set( "ansi_short",
        HIB + "Heart of Eternal City" );
      THISO -> set( "day_color", HIB );
      THISO -> set( "descs", ([
        ({ "buildings", "building", "structures" }) :
          "A large variety of wooden and stone buildings "
          "line the roads; vendors loudly urge passerby "
          "from their carts to stop and peruse their wares.",
        ({ "sky", "skies", "up", "upwards" }) :
          "High overhead you can see a faint rippling in the "
          "clear blue sky, a reminder of the existance of the "
          "Shield used to protect the city.", 
        ]) );
      desc_thingy();
      break;
    case 2 : 
      switch( zone )
        {
        case "null" :
          tell_room( THISO, strformat( "The garish signs pop "
            "out of existance one by one to balance the gradual "
            "lightening of the sky as it makes the transition "
            "from pitch-black to clear blue.  The buildings "
            "seem to almost spread out as they shrink in height, "
            "finally settling on a group of multiple-storied "
            "commercial structures." ) );
          break;
        case "fantasy" :
          tell_room( THISO, strformat( "The stone-and-wood "
            "dwellings suck in their textured surfaces as "
            "the walls smooth out into picture-perfect "
            "commercial buildings." ) );
          break;
        case "present" :
          break;
        case "future" :
          tell_room( THISO, strformat( "The skyscrapers almost "
            "seem to leap downwards as the dingy sky clears to "
            "shine brightly on the modern retail establishments "
            "now spread out about you." ) );
          break;
      }
      zone = "present";
      THISO -> set( "ansi_short",
        HIB + "Heart of Eternal City" );
      THISO -> set( "day_color", HIB );
      THISO -> set( "descs", ([
        ({ "buildings", "building", "structures" }) :
          "Various modern commercial establishments rise "
          "two stories high here, and all seem to be open "
          "for business.",
        ({ "sky", "skies", "up", "upwards" }) :
          "The sky is a bright blue, and the sun shines "
          "down warmly.", 
        ]) );
      desc_thingy();
      break;
    case 3 :
      switch( zone )
        {
        case "null" :
          tell_room( THISO, strformat( "The signs vanish as "
            "the surrounding sky-darkened mass of architecture "
            "heaves itself up towards the sky; what are now a "
            "number of tall, sterile skyscrapers snap into "
            "position against the smog-soaked blue sky." ) );
          break;
        case "fantasy" :
          tell_room( THISO, strformat( "The stone buildings "
            "stretch up into the now smog-filled sky, morphing "
            "smoothly into unadorned skyscrapers." ) );
          break;
        case "present" :
          tell_room( THISO, strformat( "The smooth concrete and "
            "brick walls of the surrounding establishments "
            "bubble up to form rough stoneworked walls.  A "
            "slight ripple passes through the air high "
            "overhead." ) );
          break;
        case "future" :
          break;
      }
      zone = "future";
      THISO -> set( "ansi_short",
        CYN + "Heart of Eternal City" );
      THISO -> set( "day_color", CYN );
      THISO -> set( "descs", ([
        ({ "buildings", "building", "structures" }) :
          "Sleek, sterile buildings rise from the ground, "
          "each no-doubt belonging to some corporation or "
          "another.",
        ({ "sky", "skies", "up", "upwards" }) :
          "The sky is a dingy blue, probably a direct result "
          "of the high levels of pollution.", 
        ]) );
      desc_thingy();
      break;
  }
  call_out( "change_stuff", random( 20 ) + 20 );
}
 
north()
{
  message_thingy();
  switch( zone )
  {
    case "null" :
      move_object( THISP, NULL "ete(0,1,0)" );
      break;
    case "fantasy" :
      move_object( THISP, FANTASY "ete(0,1,0)" );
      break;
    case "present" :
      move_object( THISP, PRESENT "ete(0,1,0)" );
      break;
    case "future" :
      move_object( THISP, FUTURE "ete(0,1,0)" );
      break;
  }
  command( "glance", THISP );
  return 1;
}
 
south()
{
  message_thingy();
  switch( zone )
  {
    case "null" :
      move_object( THISP, NULL "ete(0,-1,0)" );
      break;
    case "fantasy" :
      move_object( THISP, FANTASY "ete(0,-1,0)" );
      break;
    case "present" :
      move_object( THISP, PRESENT "ete(0,-1,0)" );
      break;
    case "future" :
      move_object( THISP, FUTURE "ete(0,-1,0)" );
      break;
  }
  command( "glance", THISP );
  return 1;
}
 
east()
{
  message_thingy();
  switch( zone )
  {
    case "null" :
      move_object( THISP, NULL "ete(1,0,0)" );
      break;
    case "fantasy" :
      move_object( THISP, FANTASY "ete(1,0,0)" );
      break;
    case "present" :
      move_object( THISP, PRESENT " ete(1,0,0)" );
      break;
    case "future" :
      move_object( THISP, FUTURE "ete(1,0,0)" );
      break;
  }
  command( "glance", THISP );
  return;
}
 
west()
{
  message_thingy();
  switch( zone )
  {
    case "null" :
      move_object( THISP, NULL "ete(0,1,0)" );
      break;
    case "fantasy" :
      move_object( THISP, FANTASY "ete(0,1,0)" );
      break;
    case "present" :
      move_object( THISP, PRESENT " ete(0,1,0)" );
      break;
    case "future" :
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
        "distance, as " + objective( THISP ) + " moves off to the "
        + query_verb() + "." ) );
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
        "in the most mysterious manner that you have ever seen." ) );
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
