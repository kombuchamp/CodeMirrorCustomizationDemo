const CODE_LEFT = `
#include <future>
#include <vector>
#include <iterator>
#include <thread>

/// <summary>
/// Maps collection using function f1, then reduces resulting collection using f2 on defined number of threads
/// </summary>
/// <param name="p">Iterator pointing at the start of collection</param>
/// <param name="q">Iterator pointing at the end of collection</param>
/// <param name="f1">Map function</param>
/// <param name="f2">Reduce function</param>
/// <param name="thread_count">Thread count</param>
/// <returns></returns>
template <typename Iter, typename F1, typename F2>
auto map_reduce_async(Iter p, Iter q, F1 f1, F2 f2, size_t thread_count) -> decltype(f1(*p))
{
    using TRes = decltype(f1(*p));

    auto task = [&f1, &f2](Iter p, Iter q)
    {
        auto res = f1(*p);
        while (++p != q)
            res = f2(res, f1(*p));
        return res;
    };

    std::vector<std::future<TRes>> task_results;

    size_t partition_size = std::distance(p, q) / thread_count;

    Iter begin = p;
    Iter end = p;
    for (auto i = 0; i < thread_count - 1; ++i)
    {
        begin = end;
        end = std::next(end, partition_size);
        task_results.push_back(std::async(std::launch::async, task, begin, end));
    }
    task_results.push_back(std::async(std::launch::async, task, end, q));

    auto result = task_results[0].get();
    for (auto it = std::next(task_results.begin()); it != task_results.end(); ++it)
    {
        result = f2(result, it->get());
    }

    return result;
}
`;

const CODE_RIGHT = `
#include <future>
#include <vector>
#include <iterator>
#include <thread>

/// <summary>
/// Maps collection using function f1, then reduces resulting collection using f2 on defined number of threads
/// </summary>
/// <param name="p">Iterator pointing at the start of collection</param>
/// <param name="q">Iterator pointing at the end of collection</param>
/// <param name="f1">Map function</param>
/// <param name="f2">Reduce function</param>
/// <param name="thread_count">Thread count</param>
/// <returns></returns>
template <typename Iter, typename F1, typename F2>
auto map_reduce_threads(Iter p, Iter q, F1 f1, F2 f2, size_t thread_count) -> decltype(f1(*p))
{
    using TRes = decltype(f1(*p));

    auto task = [&f1, &f2](Iter p, Iter q)
    {
        auto res = f1(*p);
        while (++p != q)
        {
            res = f2(res, f1(*p));
        }
        return res;
    };

    std::vector<std::thread> threads;
    std::vector<TRes> results(thread_count); // TODO: Mutex!

    size_t partition_size = std::distance(p, q) / thread_count;

    Iter begin = p;
    Iter end = p;
    for (auto i = 0; i < thread_count - 1; ++i)
    {
        begin = end;
        end = std::next(end, partition_size);
        threads.emplace_back(
            [&, begin, end, i]() { results[i] = task(begin, end); }
        );
    }
    threads.emplace_back(
        [&, end, q]() { results[thread_count - 1] = task(end, q); }
    );
    for (auto &t : threads)
    {
        t.join();
    }

    auto result = results[0];
    for (auto it = std::next(results.begin()); it != results.end(); ++it)
    {
        result = f2(result, *it);
    }
    return result;
}
`;

const mergeView = CodeMirror.MergeView(document.querySelector(".container"), {
    origLeft: CODE_LEFT,
    value: CODE_RIGHT,
    lineNumbers: true
});

const triforceBtn = document.getElementById("triforce");
const scrollLockBtn = document.querySelector(".CodeMirror-merge-scrolllock");
const lockElem = document.querySelector(".header div");
const clickEvent = new Event("click");

triforceBtn.innerHTML = "  ▲<br/>▲ ▲";
triforceBtn.addEventListener("click", e => {
    const isEnabled = scrollLockBtn.classList.contains(
        "CodeMirror-merge-scrolllock-enabled"
    );
    e.target.innerHTML = isEnabled ? "▲<br/>▲▲" : "  ▲<br/>▲ ▲";
    lockElem.innerText = isEnabled ? "🔓" : "🔒";
    lockElem.style.transform = "translateY(0)";
    setTimeout(() => {
        lockElem.style.transform = "translateY(-100%)";
    }, 500);
    scrollLockBtn.dispatchEvent(clickEvent);
});
