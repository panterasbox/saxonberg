/*
 *  the EOTL lounge.
 */

/*
 * December 7th: New Non-Combat stuff
 *      Minister
 */

inherit RoomPlusCode;
#define STEAL "gets kicked down for stealing in the lounge."
#define HEART  "common"
#define LOUNGE  "lounge"
#define MACHINE "/usr/locus/open/mac"
#define WALL "/obj/status/status_w"
#define PKILL "/obj/status/pkills/pkill_w"


void extra_reset()
{
    set( NoCombatP, 1 );
#ifdef WALL_ONLINE
    if (!present("wall")) {
	call_other(WALL, "foo");
	move_object(WALL,THISO);
    }
#endif
}


void extra_create()
{
    set( "short", "EotL Lounge");
    set( "day_long",
      "Welcome to the End of the Line player lounge.  It consists of a " +
      "spacious room filled with lots of couches and easy chairs for " +
      "weary adventurers like yourself to relax in.  There is a bar to " +
      "the north, and a circular staircase leads down to that renowned " +
      "metropolis, Eternal City.  A smaller staircase leads up to a " +
      "less hectic and quieter locale.");
    set( "day_light", WELL_LIT );
    set( "exits", ([
      "north": "bar",
      "down" : "common",
      "up"   : "game_room",
     ]) );
    set( "descs", ([
      ({ "couch", "couches", "chair", "chairs", "easy chairs" }):
          "The couches and chairs look very comfortable and inviting.",
      ({ "staircase", "staircases" }):
          "Which staircase, the circular one or the smaller one?",
      "circular staircase":
          "This staircase has a thick wooden bannister, and spirals down " +
          "towards the Heart of the city.",
      "smaller staircase":
          "This staircase, with brass railings, leads upstairs to the " +
          "gaming room.",
      "bar":
          "Dave's Bar is to the north.",
     ]) );

    set( "reset_data", ([
      "mac": MACHINE,
      "titlegenerator": "/usr/hannah/open/rtg",
    ]) );

    set( NoCombatP, 1 );
}

string post_long()
{
    if( random( 200 ) < THISP->query_player_kills() )
        return( 0 );
    return( "WARNING: KILLING IS " + ( query( NoCombatP ) ? "NOT " : "" ) +
      "PERMITTED IN THE LOUNGE.\n" );
}
