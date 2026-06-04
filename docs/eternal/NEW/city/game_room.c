// Raistlin@EotL 050794
// Feel free to add appropriate objects conducive to the theme
// of this room here.
//
// Re-written by Tabitha@Eotl June 4 1994 .. 
// Also added the games made by Toothpick, with his blessing.
//
// Check for max pks with the spiffy swinging basket added.
// -- Tabitha Sept 94

inherit RoomPlusCode;

#include "/zone/null/eternal/sanctuary.h"
#include "/zone/null/eternal/eternal.h"

#define BASKET  OBJECTS + "basket"
void extra_create()
{
   set( "short", "EotL Gaming Room" );
   set( "day_long",
      "As you reach the top of the stairs, " +
      "you are momentarily stunned by the vista " +
      "that lays out before you.  Tall plate-glass " +
      "windows run the perimeter of the " +
      "room, displaying the length and breadth " +
      "of Eternal City, and beyond.  " +
      "The room itself is similar in appearance to " +
      "the lounge downstairs, with numerous " +
      "couches and chairs spread across the plush " +
      "carpeting, interspersed with several low tables.  " +
      "A sign hangs from the centre of the ceiling: \n"+
      "       \(: COMBAT IS NOT PERMITTED IN THIS AREA.  " +
      "THANK YOU :\)");

   set( "exits",
     ([ "down"  :  "lounge" ]) );
   set( "day_light", WELL_LIT );

   set( "descs", 
     ([ ({ "couches", "couch" }) :
           "The couches, while appearing well-used, " +
           "certainly look comfortable.",
        ({ "chairs", "chair" }):
           "The collection of chairs range from the plush " +
           "to the practical",
        ({ "tables", "table", "card table", "card tables" }):
           "These low wooden tables are perfect for " +
           "playing board and card games on.",
        ({ "view", "windows", "out windows", "window", "out window" }):
           "Eternal City lies before you in its splendour.  " +
           "To the north and south, you see a " +
           "bustling main street, the exact nature of " +
           "its surface obscured by a low blanket " +
           "of cloud.  To the east glints another major " +
           "thoroughfare, and further east " +
           "a castle lies.  A jumble of old and decrepit " +
           "buildings lies to the west, " +
           "and a wavering pathway leads out of the city " +
           "there.  Several other roads " +
           "lead away from Eternal, to the north-east " +
           "and the south-east.",
            ]) );
   set( NoCombatP, 1 );
   set( "reset_data",
     ([ "basket" : BASKET ]) );
}
 
void extra_init()
{
    if( THISP->query_prop_value( "player_kills" ) > 40
      && ( !IsWizard( THISP ) ) )
        call_out( "quick_exit", 1 );
}
 
quick_exit()
{
   say( strformat( "The basket full of games swings suddenly " +
       "into " + PNAME + ", knocking " + objective( THISP ) +
       " down the stairs." ) );
   write( strformat( "The basket full of games swings suddenly " +
         "into you, knocking you down the stairs!" ) );
   say( "The basket giggles softly to itself.\n" );
   move_object( THISP, "/zone/null/eternal/lounge/lounge" );
   tell_room( "/zone/null/eternal/lounge/lounge", PNAME +
             " gets knocked out of the games room.\n", 
              ({ THISP }) );
    return 1;
}
