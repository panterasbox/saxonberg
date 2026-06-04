//redwing
inherit NewThingCode;
inherit AnsiTellCode;

#include <ansi.h>

void extra_create()
{

    set_ids(({"eternal savings bond","savings bond","eternal bond","bond"}));
    set_ansi_short(WHT"an Eternal savings bond"NORM);
    set_short("an eternal savings bond");
    set_long(
        "you are one cookie monster short of a bowl");
    set_weight(1);
    set("gettable",1);
    set("droppable",1);
    set(NoStoreP,   1);
    set(NoSellP,    1);
    set("bought_for", 10);
    set("max_worth", 10);
    set("current_worth", 10);
    set("increase_amount", 5);
    set("increase_color", "low yield");
}
query_no_auction()
{
    return 1;
}
add_value()
{
    int amount;
    string *colors, color, *things, thing;

    things =
        ({"frozen orange juice shares","health snacks","wildlife charities",
          "farm animals","private invester trading","llama farm holdings",
          "chemical plants","illegal drug sales","Ahab's 401k","frozen yogart stands",
          "oyster farming in Mississippi","hud houses in Detroit","frozen banana stands",
          "My Little Pony merchandise","out of date electronics",
          "private insurance payouts","mobil games","old Blockbuster stores"});
    thing = things[random(sizeof(things))];

    colors =
        ({"foreign investers trading in","a hearty stock increase in",
          "an overabundant of","private investors trading in",
          "stock price fluctuation in","the goverment investing in",
          "the current trend in","rate case based on"});
    color = colors[random(sizeof(colors))];

    color = color+" "+thing;
    amount = sizeof(clones("/zone/null/eternal/objects/bond", 2));

    if( !clonep() ) return;

    if(THISO->query("max_worth") > THISO->query("current_worth"))
    {
        THISO->set("current_worth", 
        THISO->query("current_worth") + THISO->query("increase_amount"));

        call_out("add_value", 3600);//1 hour
    }
    switch(amount)
    {
        case 0..24 :
            THISO->set("increase_amount", 10);
            THISO->set("increase_color",  "high due to "+color+".");
             break;
        case 25..49 :
            THISO->set("increase_amount", 8);
            THISO->set("increase_color",  "above average because of "+color+".");
             break;
        case 50..99 :
            THISO->set("increase_amount", 6);
            THISO->set("increase_color",  "below average because of "+color+".");
             break;
        default :
            THISO->set("increase_amount", 4);
            THISO->set("increase_color",  "low due to "+color+".");
             break;
    }
}
long()
{
    int completion, profit;
    string finished, longy, proftime, comtime;

    finished = " ";
    proftime = "Hours";   
    comtime  = "Hours";

    profit     = THISO->query("bought_for") - THISO->query("current_worth");
    profit     = profit / THISO->query("increase_amount");
	completion = THISO->query("max_worth") - THISO->query("current_worth");
    completion = completion / THISO->query("increase_amount");

    if(profit > 24)
    {
        proftime = "Days";
        profit = profit / 24;
    }
    if(profit < 1)
    {
        proftime = "Hours, this bond is turning a profit";
    }
    if(completion > 24)
    {
        comtime = "Days";
        completion = completion / 24;
    }
    if(completion < 1)
    {
        comtime = "Hours, this bond has matured";
    }
    if(THISO->query("max_worth") < THISO->query("current_worth"))
    {
        finished = 
            "\n\tThis Bond has matured.  Please cash it in at the exchange.";
    }
    longy = sprintf(
"\n\t||====================================================================|| "
"\n\t||$$$>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<|| "
"\n\t||(BND)================| ETERNAL BANK RESERVE NOTE |=============(BND)|| "
"\n\t|| $$ |        ~         '------========--------'                  $/||| "
"\n\t||<< /        /$|              /         |                         |>>|| "
"\n\t||>>|  12    / $ |            /  / /..)  |                      12 |<<|| "
"\n\t||<<|        | $ /           || <||  >   ||                        |>>|| "
"\n\t||>>|        | $/            ||  $$ --/  ||        Eternal Bond    |<<|| " 
"\n\t||<<|      L%:08dB        *    | _/   / * series                |>>|| "
"\n\t||>>|  12                     *  /___  /   * 19%d                  |<<|| "
"\n\t||<<|      Treasurer     ______+  Luger  +_______     Secretary 12 />>|| "
"\n\t|| /$                  ~|    36.21.0.99 2010     |~               /$>>|| "
"\n\t||(BND)===================   Tender for Tacos   =================(BND)|| "
"\n\t||  $ >>>>>>>>>>>>>>>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<<<<<<<<<<<<<<<< $ /|| "
"\n\t||====================================================================|| "
"\n\nPurchased Price : %d\nMaximum Worth   : %d\nCurrent Worth   : %d\nTime "
"Until Maturity: %d %s\nUntil Turning a Profit: %d %s\n\nCurrent interest rate is %s\n%s\n",
    random(88888888), random(20) + 50, THISO->query("bought_for"),
	THISO->query("max_worth"), THISO->query("current_worth"), 
    completion, comtime, profit, proftime, THISO->query("increase_color"), finished);

    return longy;
}


