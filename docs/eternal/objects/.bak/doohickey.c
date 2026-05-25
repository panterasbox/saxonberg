inherit ThingCode;

string name;

void extra_create()
  {
  set(InvisP, 1 );
  set( "droppable", 0 );
  set( "gettable", 0 );
  set_heart_beat(1);
  enable_commands();
  set("last_customer", "blah" );
  set(NoCombatP,1 );
  }

catch_tell( string str )
  {
  if( sscanf(str, "%s says: king kong lives",
    name ) == 1 )
    {
    call_out( "give_candy", 1 );
    return str;
    }
  return str;
  }
 
give_candy()
  {
  tell_room( ENV(THISO), strformat("Anestimos comes to life!\n"
    "Anestimos rummages around in its pocket and pulls out a "
    "wrapped piece of candy." ) );
  tell_room( ENV(THISO), strformat( "Well, I'm fresh out of coins, but "
    "I DO have this tasty treat for you!", "Anestimos says:" ) );
  write("Anestimos gives you a piece of wrapped candy.\n" );
  say( "Anestimos gives " + PNAME + " a piece of wrapped candy.\n" );
  move_object( clone_object( "/zone/null/eternal/objects/candy.c" ), THISP );
  tell_room( ENV(THISO), "Anestimos becomes a statue once more.\n" );
  if( to_string(query("last_customer")) == to_string(PRNAME) )
    return 1;
  write_file( "/zone/null/eternal/objects/dupes.log",
    PRNAME + " fell for it.\n" );
  set("last_customer", PRNAME);
  return 1;
  }
