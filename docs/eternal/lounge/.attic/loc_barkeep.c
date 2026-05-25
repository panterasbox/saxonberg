#include "/zone/null/eternal/eternal.h"
inherit MonsterCode;
inherit MonsterTalk;

#define SIGN \
  "Welcome to Dave's Bar!  Our fine selection of strictly "+ \
  "non-alcoholic beverages is listed below.  To order one, "+ \
  "simply type <buy [drink_name]>.\n"+ \
  "=======================================================\n"+ \
  "\n"+ \
  "         7-Up                      Pepsi\n"+ \
  "         Mountain Dew              Diet Pepsi\n"+ \
  "         Orange Crush              Root Beer\n"+ \
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
  set_name("dave");
  add_alias("barkeep");
  add_alias("bartender");
  set_short("Dave the Barkeep");
  set_long(
    "This is Dave, from the old Moonlighting television series.  Ever "
    "since ABC cancelled his show, he's been doing odd jobs here and "
    "there \(most notably Bruce Willis impersonations\), then finally "
    "decided to settle down in Eternal City and open up his own bar."
    "  There is sign around his neck." );
  set_race("human");
  set_gender("male");
  set_chat_chance(30);
  set_chat_rate(45);
  add_phrase("Dave cleans some glasses.\n");
  add_phrase("Dave winks knowingly at you.\n");
  add_phrase("Dave sniffs the air.\n");
}

extra_init()
{
  if( GetPWNam(PRNAME)[2] != "wizard" )
  {
    move_object( THISP, THISP->query_last_room() );
    return 1;
  }
  add_action( "buy_drink", "buy" );
  add_action( "read_sign", "read" );
  add_action( "read_sign", "look" );
  add_action( "check", "dance" );
}
 
int buy_drink(string arg) {
  object drink;
  int i, max, flag;
  string drink_cap_name;
 
  if (!arg) {
    tell_object(THISP,strformat( "Can you please repeat that?",
      "Dave tells you: " ) );
    return 1;
    }
  flag = -1;
  for (i=0, max = sizeof(drink_list); i<max; i+=2)
    if (drink_list[i] == lower_case(arg)) {
      flag = i;
      break;
      }
  if (flag == -1) {
    tell_object( THISP,"Dave tells you: Sorry, I don't sell that.\n" );
    return 1;
    }
  if ((int)THISP->query_money() < 250) {
    tell_object( THISP, strformat( "Well, normally I charge 250 "
      "coins..  Heck, you wizards are so cool; it's on me this time.",
      "Dave tells you: " ) );
    }
  else
  {
    THISP->add_money(-250);
    tell_room( THISO, PNAME + " hands Dave 250 coins.\n" );
  }
  drink_cap_name = drink_list[i+1];
  drink = clone_object( "/zone/null/eternal/lounge/can" );
  drink->add("id",drink_list[i]);
  drink->set("short","a can of "+drink_cap_name);
  drink->set("plural","cans of "+drink_cap_name);
  drink->set("long","This is a can of "+drink_cap_name+". Drink up!");
  move_object(drink, THISP);
  tell_object(THISP,"Dave hands you "+(string)drink->query("short")+".\n");
  tell_room(THISO,PNAME+" buys "+(string)drink->query("short")+".\n",
    ({THISP}));
  return 1;
}
 
int read_sign(string str) {
  if( !str && query_verb()=="read" )
  {
    write( "Read what?\n" );
    return 1;
  }
  if ( (str != "sign") && (str != "dave's sign") &&
       (str != "at sign") && (str != "at dave's sign") )
    return 0;
  write( strformat(SIGN) );
  return 1;
}

status
check(string str)
{
  if ( ( str == "dave" ) || ( str == "for dave" ) ||
       ( str == "Dave" ) || ( str == "for Dave" ) )
  {
    write ( "You dance for Dave.\n");
    tell_room( ENV(THISO), PNAME + " dances for Dave.\n", ({THISP}) );
    call_out( "dance", 2 );
    return 1;
  }
  return 0;
}
 
dance() {
  int piffle;
  object ob, destination;
  piffle = random(10);
  switch( random(10) + 1 )
  {
  case 1..5 :
    write ( "Dave looks at you strangely.\n");
    tell_room( ENV(THISO), "Dave looks at " + PNAME + " strangely.\n",
      ({THISP}) );
    break;
  case 6 :
    write ( strformat( "Dave grabs you by your shirt and screams into "
      "your face: DAMMIT!!  I'M _NOT_ DAVE THE FREAKIN' DRAGON!!!  "
      "GET THAT THROUGH YOUR THICK SKULL, YOU UTTER MORON!!!\nDave "
      "begins to froth at the mouth."));
    tell_room( ENV(THISO), strformat( "Dave grabs " + PNAME + " by " +
      possessive(THISP) + " shirt and screams into " + 
      possessive(THISP) + " face: DAMMIT!!  I'M _NOT_ DAVE THE FREAKIN' "
      "DRAGON!!!  GET THAT THROUGH YOUR THICK SKULL, YOU UTTER MORON!!!\n"
      "Dave begins to froth at the mouth." ), ({THISP}) );
    break;
  case 7..8 :
    write( "Dave attempts to join you in the dance, but fail miserably.\n"
      "Dave cries for a little bit.\n" );
    tell_room( ENV(THISO), strformat( "Dave attempts to join " + PNAME +
      " in the dance, but fails miserably.\nDave cries for a little bit." ),
      ({THISP}) );
    break;
  case 9 :
    write ( "Dave looks amused, and gives you a coin for your troubles.\n");  
    tell_room( ENV(THISO), strformat("Dave looks amused, and gives "
      + PNAME + " a coin for " + possessive(THISP) + " troubles."), ({THISP}) );
    THISP->add_money(1);
    break;
  case 10 :
  default :
    destination = THISP->query_last_room();
    write( "Dave rolls his eyes with a look of exasperation.\n"
      "Dave calmly picks you up and punts you out of the room!\n");
    tell_room( ENV(THISO), strformat( "Dave rolls his eyes with a look of "
      "exasperation.\nDave calmly picks up " + PNAME + " and punts " 
      + objective(THISP) + " out of the room!"), ({THISP}) );
    tell_room( destination, PNAME + " lands in the room with a thud!\n" 
      "Must've upset Dave..\n");
    move_object( THISP, destination );
    command( "glance", THISP );
    break;
  }
  return 1;
}
