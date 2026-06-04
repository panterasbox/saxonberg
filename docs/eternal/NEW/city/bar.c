inherit RoomPlusCode;

#include "/zone/null/eternal/eternal.h"
 
#define LOUNGE  "lounge"
#define BARKEEP MONSTERS +"barkeep"
 
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
   ({ "7-up",         "7-Up",
      "mountain dew", "Mountain Dew",
      "orange crush", "Orange Crush",
      "pepsi",        "Pepsi",
      "diet pepsi",   "Diet Pepsi",
      "root beer",    "Root Beer"
   });
 
void extra_create()
{
   seteuid(getuid(THISO));
   set( "short", "Dave's Bar" );
   
   set( "day_long",
      "Welcome to Dave's Bar, located just above downtown Eternal City.  "+
      "This is a place where you can come and relax with your friends, "+
      "and enjoy a few drinks while you're at it...  However, Dave's "+
      "is a purely dry establishment, so if you're looking to get drunk, "+
      "look elsewhere.\n"+
      "\n"+
      "Next to the bar is a large, friendly-looking sign.");
 
   set( "day_light", WELL_LIT );
   set( "night_light", PART_LIT );
 
   set( "reset_data", ([ "keeper" : BARKEEP ]) );
   set( "exits", 
      ([
         "south" : "lounge",
      ]) );
      
   set( "descs",
      ([
         ({ "sign" }) :
         "This is a large neon sign, listing the various items "+
         "for sale here at Dave's Bar.  Try reading it for more "+
         " information.",
      ]) );
      
}
 
void extra_init()
{

   if( THISP->query_aggressive() )
      destruct( THISP );
   add_action( "buy_drink", "buy" );
   add_action( "read_sign", "read" );
//  Check for exits added due to Morgana's wei lame Love Room,
//  which modified the exits of the bar.
//  Kudos and hugs to Hannah for the help.
// -- Tabitha Jan 95
   if( sizeof( query( "exits" ) ) > 1 )
   {
      set( "exits", m_delete( query( "exits" ),
           "up" ) );
      return;
   }
}
 
int buy_drink(string arg)
{
   object drink;
   int    i, max, flag;
   string drink_cap_name;
 
   if (!present("barkeep"))
   {
      tell_object(THISP,
         "Sorry, Dave's not here to take your order right now.\n");
      return 1;
   }
   if (!arg)
   {
      tell_object(THISP,"Dave tells you: Can you please repeat that?\n");
      return 1;
   }
   flag = -1;
   for (i=0, max = sizeof(drink_list); i<max; i+=2)
      if (drink_list[i] == lower_case(arg))
      {
         flag = i;
         break;
      }
   if (flag == -1)
   {
      tell_object(THISP,"Dave tells you: Sorry, I don't sell that.\n");
      return 1;
   }
   if ((int)THISP->query_money() < 250)
   {
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
 
int read_sign(string str)
{
   if ((str != "sign") && (str != "neon sign"))
      return 0;
   write( strformat(SIGN) );
   return 1;
}
