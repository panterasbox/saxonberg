#include "/zone/null/eternal/eternal.h"

inherit RoomPlusCode;

extra_create()
{
    object *random_wizs, random_wiz;
    string wname, hisher, sex, race;

    random_wizs = users();
    random_wizs = filter_array(random_wizs, "immortal_people");
    random_wiz  = random_wizs[random(sizeof(random_wizs))];

    wname = random_wiz->query_real_name();
    hisher = possessive(wname);
    sex    = random_wiz->query_gender();
    race   = random_wiz->query_race();

    set("map_symbol", "B");
    set("short","Eternal City Bond Exchange");
    set("day_long",
        "The main hall of the bond exchange has been decorated in dark red oak "
        "and white marble.  The room is oval shaped with a sunken area in the "
        "center of it where bond traders can mingle.  Surrounding the sunken "
        "area is an ornate rail that helps separate the traders from the "
        "workers above.  The upper area is full of  ornate desks with "
        "accountants and secretaries working at them.  With this being a "
        "business day the bond exchange is full of people running around doing "
        "work.  A large mosaic has been painted on the ceiling that stretches "
        "almost the whole length of the room.  Pressed into the wall, right next "
        "to the entrance, is a large bronze sign.");
    set("night_long",
        "The main hall of the bond exchange has been decorated in dark red oak "
        "and white marble.  The room is oval shaped with a sunken area in the "
        "center of it where bond traders can mingle.  Surrounding the sunken "
        "area is an ornate rail that helps separate the traders from the "
        "workers above.  The upper area is full of  ornate desks with "
        "accountants and secretaries working at them.  Even with it being "
        "nighttime the exchange is full of people running around working.  A "
        "large mosaic has been painted on the ceiling that stretches almost "
        "the whole length of the room.  Pressed into the wall, right next to "
        "the entrance, is a large bronze sign.");    
    set("day_light",   60);
    set("night_light", 60);
    set(InsideP, 1);
    add("exits",([
        "south" : "/zone/null/eternal/room048"]));
    set("descs",([
        ({"dark red oak","red oak","oak"}) :
            "It looks like most of the interior has been decorated with the "
            "dark red oak.  Almost every inch of the wood has been etched with "
            "fancy designs and symbols.",
        ({"fancy designs and symbols","designs","symbols"}) :
            "As soon as you get a closer look at the designs and symbols you "
            "release they are all dollar signs.  Each of the dollar signs have "
            "been stretched and manipulated to make larger symbols and "
            "designs.  Well, this place is a place of money.",
        ({"white marble","marble"}) :
            "Glancing around the room you see marble used in various spots as "
            "decoration and as structure.  The use of marble on the flooring "
            "defiantly gave this room a classic feel.  You are slightly amazed "
            "that, even though this floor gets a lot of foot traffic, it still "
            "has a nice glossy shine.  The wonderful marvels of a high level "
            "janitor at work!",
        ({"sunken area","area"}) :
            "Most of the traders are down in the sunken area.  Your small "
            "potatoes account wont even get their attention.  Maybe you should "
            "read the sign to figure out what to do next.",
        ({"ornate rail","rail"}) :
            "The ornate rail is more for show then actual use of holding "
            "something back.  Carved into the sides of the rail are fancy "
            "designs and symbols.",
        ({"large mosaic","mosaic","painting","ceiling"}) :
            "As you glance upwards at the mosaic on the ceiling you the "
            "familiar feeling of someone watching you.  The mosaic is of "
            "multiple different portraits of powerful men and women.  Each one "
            "of them is shown standing straight and strong while looking down "
            "at the people below them.  It seems like the feeling of being "
            "watched is coming from the portrait of "+capitalize(wname)+".",
        ({"portrait","portraits"})  :
            "Of all of the portraits the one of "+capitalize(wname)+" catches "
            "your eye.  "+capitalize(wname)+" is depicted as a "+sex+" "+race+
            " wearing clothing that modestely cover "+hisher+" frame.",
        ({"large bronze sign","bronze sign","sign"}) :
            "The sign is covered in words.  Maybe you could 'read sign' to "
            "figure out what is written on it."]));
    set("day_descs",([
        ({"accountants and secretaries","accountants","secretaries","traders",
          "brokers"}) :
            "You try to get the attention of some of the workers here but they "
            "are just too busy to deal with you.  Maybe you should read the "
            "sign to figure out what to do next."]));
    set("night_descs",([
        ({"accountants and secretaries","accountants","secretaries","traders",
          "brokers"}) :
            "Since it is night time the people working here are extra busy.  "
            "Everytime you try to get their attention they just point you to "
            "the sign at the entrance.  Maybe you should read the sign to figure "
            "out what to do next."]));
}
int immortal_people(object ob)
{
    if(ob->query_wizard())
    {
        return 1;
    }
}
void extra_init()
{
    add_action("do_read", "read");
    add_action("do_buy", "buy");
    add_action("do_sell", "sell");
}
int do_read(string str)
{
    string *choices;
    int fee;

    choices =
        ({"large bronze sign","bronze sign","sign"});
    fee = 5000 - (THISP->query_stat("chr") / 100) * 200;
    if(fee < 4000) fee = 4000;

    if(!str || member(choices,str)==-1)
    {
        return notify_fail("Read what?\n");
    }
    if(THISP->query_skill("read languages") < 3)
    {
        if(THISP->query_skill("read languages") < 1)
        {
            tell_object(THISP,
                "You don't know how to read.\n");
            return 1;
        }
        tell_object(THISP,
            "The language is a little above your ability.\n");
        return 1;
    }
    tell_object(THISP, sprintf(
"\n        $                                                     $       "
"\n     ,$$$$$,                                              ,$$$$$,     " 
"\n   ,$$$'$`$$$                                            ,$$$'$`$$$   "
"\n   $$$  $   `                                            $$$  $   `   "
"\n   '$$$,$                                                '$$$,$       "
"\n     '$$$$,              Hello, Fellow Investor            '$$$$,     "
"\n       '$$$$,            Welcome to the Reserve             '$$$$,    "
"\n        $ $$$,   We are in the business to make you money!    $ $$$,  "
"\n    ,   $  $$$                  Simply:                   ,   $  $$$  "
"\n    $$$,$.$$$'                Buy a Bond                  $$$,$.$$$'  "
"\n     '$$$$$'          Wait until it matures, then...       '$$$$$'    "
"\n        $             Sell the Bond for a nice profit         $       "
"\n\n\tThere are three different types of bonds we sell:\n"
"Small: Starts at 25k, matures until 50k, and we will sell it for %d.\n"
"Medium: Starts at 50k, matures until 100k, and we will sell it for %d.\n"
"Large: Starts at 100k, matures until 200k, and we will sell it for %d.\n\n"
"The larger the bond the longer it will take to mature but the return it will "
"give you is higher.  Please be advised that even though these bonds are not "
"storable they can be traded.  Any problems please mail redwing.\n",
fee + 25000, fee + 50000, fee + 100000));

    return 1;
}
int do_buy(string str)
{
    object bond;
    int start, cost, fee, max, increase;

    fee = 5000 - (THISP->query_stat("chr") / 100) * 200;

    if(fee < 4000) fee = 4000;

    if(!str)
    {
        tell_object(THISP, 
            "Do you want to buy a small bond, medium bond, or large bond?\n");
        return 1;
    }
    switch(str)
    {
        case "small" :
        case "small bond" :
            start = 25000;
            cost = 25000 + fee;
            max  = 50000;
            break;
        case "medium" :
        case "medium bond"   :
            start = 50000;
            cost = 50000 + fee;
            max = 100000;
            break;
        case "large" :
        case "large bond"   :
            start = 100000;
            cost = 100000 + fee;
            max = 200000;
            break;
        default :
            tell_object(THISP,
                "You can either buy a small bond, medium bond, or a large bond.\n");
            tell_room(ENV(THISP), sprintf(
                "%s tries to buy a bond but fails.\n", 
                THISP->query_name()), ({THISP}));
        return 1;
    }
    if(sizeof(all_inventory(THISP)) > 99)
    {
        tell_object(THISP,
            "Your inventory is too full to hold onto anything else.\n");
        return 1;
    }
    if(THISP->query_money() < cost)
    {
        tell_object(THISP, sprintf(
            "You don't have %d coins to pay for that.\n",
             cost));
        tell_room(ENV(THISP), sprintf(
            "%s turns out their pockets dejectedly.\n",
            THISP->query_name()), ({THISP}));
        return 1;
    }
    tell_object(THISP, sprintf(
        "You buy a %s for %d gold.\n",
        str, cost));
    tell_room(ENV(THISP), sprintf(
        "%s buys a %s.\n",
        THISP->query_name(), str), ({THISP}));

    bond = clone_object("/zone/null/eternal/objects/bond");
   
    bond->set("bought_for", cost);
    bond->set("max_worth", max);
    bond->set("current_worth", start);
    bond->add_value();

    move_object(bond, THISP);
    THISP->add_money(-cost);

    return 1;
}
int do_sell()
{
    int cash;
    object treasure;
 
    treasure = present_clone("/zone/null/eternal/objects/bond", THISP);

    if(!treasure)
    {
        tell_player(THISP, 
            "You need to have a bond to sell.");
        return 1;
    }
    cash = treasure->query("current_worth");

    tell_object(THISP, sprintf(
        "You sell the bond back to the exchange.\n%d coins land in your "
        "inventory.\n",
        cash));
    tell_room(ENV(THISP),sprintf(
        "%s sells a bond.\n",
        capitalize(THISP->query_name())), ({THISP}));
    THISP->add_money(cash);
    destruct(treasure);

    return 1;
}


