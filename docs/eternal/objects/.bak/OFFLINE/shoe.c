inherit ObjectCode;

#define ROGUES   "/zone/null/eternal/rogue"
#define DRAKE    "zone/fantasy/entesia/room/entesia/inn"
#define SHOP     "/zone/null/eternal/shop2"
#define LOCKERS  "/zone/null/eternal/bbinn2"
#define COMMON    "/zone/null/eternal/common"
#define AGES      "/zone/null/eternal/stat_room_1"
#define BANK     "/zone/null/eternal/bank"

string dest,name;
int player;
object ob;

init_args() {}

extra_create()
{
    seteuid(getuid());
    set("id", ({ "boot",
                 "boot" }) );
    set("short","a pair of leather boots");
    set("long",
"This is the nifty Swift Wind Glider.  It is light but sturdy, however, it is"+ 
"\nnot the easiest thing to control in strong winds.  This glider allows one"+ 
"\nto fly from one place to another or fly to another player.\n\n"+  

"Type: 'fly destination/player name' to use the glider.\n\n"+

"The following are the places that you can fly to:\n" +
"         PC&A         Bed & Breakfast     Heart\n" +
"         Mail         Temple of Ages      <player name>\n"
);

}
   
void init()
{
    add_action("fly","fly");
}
   
int fly(string str)
{
   player = 0;
   if (!str)
   {
       write("Where do you want to fly?\n");
       return 1;
   }
   switch(str)
   {
       case "drake"   : dest = DRAKE;            break;
       case "rogues"  : dest = ROGUES;           break;
       case "shop"    : dest = SHOP;             break;
       case "lockers" : dest = LOCKERS;          break;
       case "common"  : dest = COMMON;           break;
       case "ages"    : dest = AGES;             break;
       default        : dest = str;              break;
   }
   if(dest==str)
   {
       ob = find_player(str);
       if(!ob) ob = find_living(str);
       if(!ob)
       {
           write("Sorry no such living thing!\n");
           return 1;
       }
       player = 1;
   }
   else if( !player )
   {
       ob = find_object(dest);
       if(!ob)
       {
           write("Sorry, an Error has occurred.\n");
           return 1;
       }
   }
   
   name = capitalize((string)THISP->query_name());
   if ((string)ob->realm()=="NT")
   {
       write("A strong wind prevents you from flying there.\n");
       return 1;
   }
   if ((string)environment(this_player())->realm()=="NT")
   {
       write("A strong wind prevents you from flying out of this room.\n");
       return 1;
   }
   if(!player)
   {
       move_object(THISP, ob);
       return 1;
   }
   move_object(THISP, environment(ob));
   command("look", THISP);
   return 1;
}
