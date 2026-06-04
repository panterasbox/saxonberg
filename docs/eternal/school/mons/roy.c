inherit MonsterCode;
#include "../defs.h"

void extra_create()
{
    set_name("Roy");
    add_alias("roy");
    add_alias("officer");
    add_alias("truant officer");
    set_short("Roy the Crossing Guard");
    set_long(
      "This is Roy.  Roy is a large, somewhat dull man.  He is "
      "almost fifty years old and this is the best job he has "
      "ever had, in his opinion.  The Eternal City School Board "
      "pays him $5.15 an hour to sit on his butt all day and "
      "make sure that no newbie runts kill themselves in the road.  "
      "Being a failure at most of life's little challenges, Roy takes "
      "great pleasure from doing something that even someone "
      "of his meager intellect can do: boss around little kids."
    );
    set_gender("male");
    set_alignment(-1200);
    set_stat("str",70);
    set_stat("con",40);
    set_stat("chr",2);
    set_race("human");
}

void extra_init()
{
    add_action("do_save", "road");
}

status do_save(object who)
{
    string mess;
    if(who==THISO)return 0;
    if(!who)who=THISP;
    mess="Hey, wotareya an idiot or sumpin?  Dontchew see them cars "
    "zippin' by?  Man, if you got flattened I'd sure lose my job, "
    "you punk!  So watch out!";
    tell_room(ENV(who),who->query_name()+" tries to walk into the road but Roy "
      "grabs "+objective(who)+"!\n",({who}));
    tell_object(who,"As you try to step into the road, Roy grabs you by the "
      "collar!\n");
    ( "/secure/player/commands/say"->do_command(THISO, mess));
    return 1;
}

