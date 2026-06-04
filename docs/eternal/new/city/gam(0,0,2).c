inherit RoomReadCode;
 
#define SIGN "\n"\
  "             +-----------------------------------------+\n" \
  "             |  Combat is not permitted in this room.  |\n" \
  "             |     Thank you for your cooperation,     |\n" \
  "             |      involuntary though it may be.      |\n" \
  "             +-----------------------------------------+\n"                 
 
void extra_create()
  {
  set( "short", "EotL Gaming Room" );
  set( "day_long",
    "As you reach the top of the stairs, you are momentarily "
    "stunned by the vista that lays out before you.  Tall "
    "plate-glass windows run the perimeter of the room, "
    "displaying a three-hundred sixty degree view of Eternal "
    "City, and beyond.  The room itself is similar in "
    "appearance to the lounge downstairs, with numerous "
    "couches and chairs spread across the plush carpeting, "
    "interspersed with several low tables.  A sign hangs "
    "from the center of the ceiling." );
  set( "exits", ([
    "down" : "lou(0,0,1).c"
    ]) );
  set( "day_light", 60 );
  set( "descs", ([
    ({ "couches", "couch" }) :
      "The couches, while appearing well-used, certainly look "
      "comfortable.",
    ({ "chairs", "chair" }) : 
      "The collection of chairs range from the plush to the "
      "practical",
    ({ "tables", "table", "card table", "card tables" }) :
      "These low wooden tables are perfect for playing board "
      "and card games on.",
    ({ "view", "windows", "out windows", "window", "out window" }) :
      "Eternal City lies before you in all its splendour.  "
      "To the north and south, you see a bustling main street, "
      "the exact nature of its surface obscured by a low blanket "
      "of cloud.  To the east glints another major thoroughfare, "
      "and further east a castle lies.  A jumble of old and "
      "decrepit buildings lies to the west, and a wavering "
      "pathway leads out of the city there.  Several other roads "
      "lead away from Eternal, to the northeast and the southeast.",
    "sign" :
      SIGN,
      ]) );
  set( "read", ([
    "sign" :
      SIGN,
    ]) );
  set( "reset_data", ([
    "basket" :
      "/zone/null/eternal/objects/basket"
    ]) );
  set( InsideP, 1 );
  set( NoCombatP, 1 );
  }
 
void extra_init()
  {
  if( THISP -> query_prop_value( "player_kills" ) > 200
    && ( !IsWizard( THISP ) ) )
    call_out( "quick_exit", 1 );
  }
 
int is_juggler()
  {
  if( member( map_array( deep_inventory( THISP ), #'load_name ),
    "/usr/jimbotomy/toys/juggle/ddbag" ) != -1 ) 
    return 1;
  return 0;
  }
 
query_enter_ok( object what )
  {
  if( is_juggler() )
    {
    tell_object( THISP, "You may not enter this area with "
      "juggling balls!\nTry a less crowded area.\n" );
    return 1;
    }
  }
 
quick_exit()
  {
  say( strformat( "The basket full of games swings suddenly "
    "into " + PNAME + ", knocking " + objective( THISP ) +
    " down the stairs.\nThe basket giggles softly to itself." ) );
  write( strformat( "The basket full of games swings suddenly "
    "into you, knocking you down the stairs!" ) );
  move_object( THISP, "/zone/null/eternal/lounge/lounge" );
  tell_room( "/zone/null/eternal/lounge/lounge", PNAME +
    " gets knocked out of the games room.\n", ({ THISP }) );
  return 1;
  }
 
nomask mixed query( string var )
  {
  if ( var == NoCombatP ) return 1;
    return ::query(var);
  }
