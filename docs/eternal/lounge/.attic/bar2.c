inherit RoomPlusCode;
 
#define LOUNGE "/zone/null/eternal/lounge/"
#define BARKEEP LOUNGE + ".attic/barkeep"
#define SMIRKY  LOUNGE + ".attic/barkeep2"
 
#define SIGN \
  "Welcome to Dave's Bar!  Our fine selection of strictly "+ \
  "non-alcoholic beverages is listed below.  To order one, "+ \
  "simply type <buy [drink_name]>.\n"+ \
  "=======================================================\n"+ \
  "\n"+ \
  "7-Up                      Pepsi\n"+ \
  "Mountain Dew              Diet Pepsi\n"+ \
  "Orange Crush              Root Beer\n"+ \
  "\n"+ \
  "=======================================================\n"+ \
  "All beverages come in recyclable aluminum cans and cost "+ \
  "250 coins."
 
string *drink_list =
({ 
   "7-up",         "7-Up",
   "mountain dew", "Mountain Dew",
   "orange crush", "Orange Crush",
   "pepsi",        "Pepsi",
   "diet pepsi",   "Diet Pepsi",
   "root beer",    "Root Beer"
});
 
void extra_create() {
  seteuid(getuid(THISO));
  set( "short", "Dave's Bar" );
  set( "day_light", WELL_LIT );
  set( "reset_data", ([
    "barkeeper" : BARKEEP,
    ]) );
  set( "exits", ([
    "south" : "lounge",
    ]) );
  set( "descs", ([
    ({ "sign" }) :
      "This is a large neon sign, listing the various items "+
      "for sale here at Dave's Bar.  Try reading it for more "+
      "information.",
    ]) );
  set( InsideP, 1 );
}
 
extra_init() {
  if( present( "maruchan mac" ) )
    {
    destruct( present( "maruchan mac" ) );
    }
  if( THISP->query_aggressive() )
    destruct( THISP );
  add_action( "buy_drink", "buy" );
  add_action( "read_sign", "read" );
  add_action( "check", "dance" );
}
 
int buy_drink(string arg) {
  object drink;
  int i, max, flag;
  string drink_cap_name;
 
  if ( !present("barkeep") ) {
    tell_object( THISP, 
      "Sorry, Dave's not here to take your order right now.\n");
    return 1;
    }
  if (!arg) {
    tell_object(THISP,"Dave tells you: Can you please repeat that?\n");
    return 1;
    }
  flag = -1;
  for (i=0, max = sizeof(drink_list); i<max; i+=2)
    if (drink_list[i] == lower_case(arg)) {
      flag = i;
      break;
      }
  if (flag == -1) {
    tell_object(THISP,"Dave tells you: Sorry, I don't sell that.\n");
    return 1;
    }
  if ((int)THISP->query_money() < 250) {
    tell_object(THISP, strformat(
      "Sorry, that costs 250 coins, and you can't seem to afford that.",
      "Dave tells you: " ));
    return 1;
    }
  drink_cap_name = drink_list[i+1];
  drink = clone_object(LOUNGE + "can");
  drink->add("id",drink_list[i]);
  drink->set("short","a can of "+drink_cap_name);
  drink->set("plural","cans of "+drink_cap_name);
  drink->set("long","This is a can of "+drink_cap_name+". Drink up!");
  move_object(drink, THISP);
  tell_object(THISP,"Dave hands you "+(string)drink->query("short")+".\n");
  tell_room(THISO,PNAME+" buys "+(string)drink->query("short")+".\n",
    ({THISP}));
  THISP->add_money(-250);
  return 1;
}
 
int read_sign(string str) {
  if ((str != "sign") && (str != "neon sign"))
    return 0;
  write( strformat(SIGN) );
  return 1;
}
 
string long(string str) {
  if (present("corpse of dave")) return (
    "                             D A V E ' S     B A R                    \n"
    "                    _________________________________________          \n"
    "                   |/---------------------------------------\\| |-----| \n"
    "                   ||                         My god..      || | Dew | \n"
    "                   ||        \\ \\        \\   You KILLED      || ------- \n"
    "      ___          ||        \\ \\ \\      \\ \\  Dave! \\    ,~~~\"\",        \n"
    "   _/ `--'__       ||          \\          \\          \\  |>>>>>|        \n" 
    "  /\\  >o<  /\\      ||                                   (\\\\\\//)        \n"
    " |  \\  |  /  ||**|)||____U_U_U_U_U_U_V____   (|**|  _____)___(_____     \n"
    "----____------||||----------------------------||||-(               )-) \n"
    "___(_  _)___________________________________________|   < DEVO >  |__| \n"
    "_____||______________________________________________\\            /__| \n"
    "      '                                               |          |     \n"
    "---- The only obvious exit is south.\n"
    );
  if (present("barkeep")) return (
    "                             D A V E ' S     B A R                    \n"
    "                    _________________________________________          \n"
    "      ----.        |/---------------------------------------\\| |-----| \n"
    "     \"\"  _}        ||                                       || | Dew | \n"
    "     \"@   >        ||        \\ \\        \\                   || ------- \n"
    "     ,\\   7        ||        \\ \\ \\      \\ \\             ,~~~\"\",        \n"
    "   _/ `---__       ||          \\          \\             |>>>>>|        \n"
    "  /\\  >o<  /\\      ||                                   (\\\\\\//)        \n"
    " |  \\  |  /  ||**|)||____U_U_U_U_U_U_V____   (|**|  _____)___(_____     \n"
    "--------------||||----------------------------||||-(               )-) \n"
    "____________________________________________________|   < DEVO >  |__| \n"
    "_____________________________________________________\\            /__| \n"
    "                                                      |          |     \n"
    "---- The only obvious exit is south.\n"
    );
  else return (
    "         .                   D A V E ' S     B A R                \n"
    "        / \\         _________________________________________          \n"
    "   ___/_____\\____  |/---------------------------------------\\| |-----| \n"
    "  /              \\ ||                                       || | Dew | \n"
    "  | Dave's DEAD, | ||        \\ \\        \\                   || ------- \n"
    "  | ya bastards! | ||        \\ \\ \\      \\ \\             ,~~~\"\",        \n"
    "  \\______________/ ||          \\          \\             |>>>>>|        \n"
    "                   ||                                   (\\\\\\//)        \n"
    "              |**|)||____U_U_U_U_U_U_V____   (|**|  _____)___(_____     \n"
    "--------------||||----------------------------||||-(               )-) \n"
    "____________________________________________________|   < DEVO >  |__| \n"
    "_____________________________________________________\\            /__| \n"
    "                                                      |          |     \n"
    "---- The only obvious exit is south.\n"
    );
}
 
int check(string str) {
  if ( ( str == "dave" ) || ( str == "for dave" ) ||
       ( str == "Dave" ) || ( str == "for Dave" ) ) {
    if (!present("barkeep")) {
      write( "You gimp!  Dave isn't here!" );
      say( strformat( PNAME + " attempts to dance for Dave, even though "
        "Dave isn't anywhere around!"));
      return 1;
      }
    write ( "You dance for Dave.\n");
    say ( PNAME + " dances for Dave.\n");
    call_out( "dance", 2 );
    return 1;
    }
}
 
dance() {
  int piffle;
  object ob;
  piffle = random(10);
  if ( piffle < 4 ) {
    write ( "Dave looks at you strangely.\n");
    say ( "Dave looks at " + PNAME + " strangely.\n");
    return 1;
    }
  if ( piffle < 6 ) {
    write ( strformat( "Dave grabs you by your shirt and screams into "
      "your face: DAMMIT!!  I'M _NOT_ DAVE THE FREAKIN' DRAGON!!!  "
      "GET THAT THROUGH YOUR THICK SKULL, YOU UTTER MORON!!!\nDave "
      "begins to froth at the mouth."));
    say ( strformat( "Dave grabs " + PNAME + " by " + possessive(THISP) +
      " shirt and screams into " + possessive(THISP) + " face: DAMMIT!!  "
      "I'M _NOT_ DAVE THE FREAKIN' DRAGON!!!  GET THAT THROUGH YOUR "
      "THICK SKULL, YOU UTTER MORON!!!\nDave begins to froth at the "
      "mouth."));
    return 1;
    }
  if ( piffle < 7 ) {
    if ( present("smirky")) {
      write( "The smirk is wiped right off of Dave's face.\n");
      say( strformat( "The smirk is wiped right off of Dave's face by " 
        + PNAME + "'s dancing."));
      destruct( present("smirky") );
      ob = clone_object( BARKEEP );
      move_object( ob, THISO );
      return 1;
      }
    if ( present("barkeep") ){
      write( strformat( "Dave begins to smirk, clearly amused by "
        "your attempt to entertain him.")); 
      say( strformat( "Dave begins to smirk, clearly amused by " 
        + PNAME + "'s attempt to entertain him."));
      destruct( present("barkeep") );
      ob = clone_object( SMIRKY );  
      move_object( ob, THISO );
      return 1;
      }
    }
  if ( piffle < 9 ) {
    write ( "Dave looks amused, and gives you a coin for your troubles.\n");  
    say ( strformat("Dave looks amused, and gives " + PNAME + " a coin for "
      + possessive(THISP) + " troubles.\n"));
    THISP->add_money(1);
    return 1;
    }
  if ( piffle < 10 ) {
    write ( "Dave rolls his eyes with a look of exasperation.\n"
      "Dave calmly picks you up and punts you out of the bar!\n");
    say ( "Dave rolls his eyes with a look of exasperation.\n"
      "Dave calmly picks up " + PNAME + " and punts " + objective(THISP) +
      " out of the bar!\n");
    tell_room( LOUNGE "lounge", PNAME + " lands in the room with a thud!\n" 
      "Must've upset Dave..\n");
    move_object( THISP, LOUNGE "lounge" );
    command( "glance", THISP );
    return 1;
    }
  return 1;
}
